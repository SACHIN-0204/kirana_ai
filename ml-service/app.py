import math
import os

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from prophet import Prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error


app = Flask(__name__)
CORS(app)


def clean_time_series(data, minimum_rows=5):
    """Validate, aggregate, sort, and fill a sales time series."""
    if not isinstance(data, list):
        raise ValueError('data must be an array')

    if len(data) < minimum_rows:
        raise ValueError(f'Need at least {minimum_rows} data points')

    frame = pd.DataFrame(data)
    if 'ds' not in frame.columns or 'y' not in frame.columns:
        raise ValueError('Each data point must contain ds and y')

    frame['ds'] = pd.to_datetime(frame['ds'], errors='coerce')
    frame['y'] = pd.to_numeric(frame['y'], errors='coerce')
    frame = frame.dropna(subset=['ds', 'y'])

    if len(frame) < minimum_rows:
        raise ValueError('Not enough valid data after cleaning')

    frame = frame.groupby('ds', as_index=False)['y'].sum().sort_values('ds')
    date_range = pd.date_range(frame['ds'].min(), frame['ds'].max())
    frame = frame.set_index('ds').reindex(date_range, fill_value=0).reset_index()
    frame.columns = ['ds', 'y']

    if len(frame) < minimum_rows:
        raise ValueError('Not enough historical dates')

    return frame


def create_model():
    return Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        changepoint_prior_scale=0.3,
        interval_width=0.8,
    )


def get_periods(value, default=7):
    try:
        periods = int(value)
    except (TypeError, ValueError):
        periods = default
    return min(max(periods, 1), 30)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ML service running',
        'prophet': 'available',
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    try:
        body = request.get_json(silent=True) or {}
        periods = get_periods(body.get('periods', 7))
        frame = clean_time_series(body.get('data', []))

        model = create_model()
        model.fit(frame)
        forecast = model.predict(model.make_future_dataframe(periods=periods))
        future_only = forecast[forecast['ds'] > frame['ds'].max()]

        result = [
            {
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predictedQty': max(0, round(float(row['yhat']), 2)),
                'lower': max(0, round(float(row['yhat_lower']), 2)),
                'upper': max(0, round(float(row['yhat_upper']), 2)),
            }
            for _, row in future_only.iterrows()
        ]

        recent_avg = float(frame['y'].tail(7).mean())
        older_avg = (
            float(frame['y'].iloc[-30:-7].mean())
            if len(frame) > 30
            else recent_avg
        )
        trend = (
            'RISING' if recent_avg > older_avg * 1.1 else
            'FALLING' if recent_avg < older_avg * 0.9 else
            'STABLE'
        )

        accuracy = None
        if len(frame) >= 17:
            try:
                train = frame.iloc[:-7]
                test = frame.iloc[-7:]
                validation_model = create_model()
                validation_model.fit(train)
                validation_forecast = validation_model.predict(
                    validation_model.make_future_dataframe(periods=7)
                )
                predictions = validation_forecast['yhat'].iloc[-7:].values
                actuals = test['y'].values
                mae = float(mean_absolute_error(actuals, predictions))
                rmse = float(math.sqrt(mean_squared_error(actuals, predictions)))
                mape = float(
                    np.mean(np.abs((actuals - predictions) / (actuals + 1e-5))) * 100
                )
                accuracy = {
                    'mae': round(mae, 2),
                    'rmse': round(rmse, 2),
                    'mape': round(mape, 2),
                    'accuracy_pct': round(max(0, 100 - mape), 1),
                }
            except Exception as accuracy_error:
                app.logger.warning('Accuracy calculation failed: %s', accuracy_error)

        return jsonify({
            'forecast': result,
            'totalPredictedDemand': round(sum(item['predictedQty'] for item in result), 2),
            'forecastDays': periods,
            'trend': trend,
            'accuracy': accuracy,
            'modelInfo': {
                'dataPointsUsed': len(frame),
                'algorithm': 'Facebook Prophet',
                'avgDailySales': round(float(frame['y'].mean()), 2),
            },
        }), 200

    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    except Exception as error:
        app.logger.exception('Prediction error')
        return jsonify({'error': str(error)}), 500


@app.route('/reorder-logic', methods=['POST'])
def reorder_logic():
    try:
        body = request.get_json(silent=True) or {}
        products = body.get('products', [])
        forecast_days = get_periods(body.get('forecastDays', 7))

        if not isinstance(products, list):
            return jsonify({'error': 'products must be an array'}), 400

        results = []
        for product in products:
            sales_data = product.get('salesData', [])
            if len(sales_data) < 10:
                results.append({
                    **product,
                    'status': 'INSUFFICIENT_DATA',
                    'suggestedOrderQty': 0,
                    'urgency': 'UNKNOWN',
                })
                continue

            frame = clean_time_series(sales_data, minimum_rows=5)
            model = create_model()
            model.fit(frame)
            future = model.predict(model.make_future_dataframe(periods=forecast_days))
            future_only = future[future['ds'] > frame['ds'].max()]
            total_demand = max(0, round(float(future_only['yhat'].sum()), 2))

            current_stock = float(product.get('currentStock', 0) or 0)
            min_threshold = float(product.get('minThreshold', 0) or 0)
            gap = total_demand - current_stock
            suggested_qty = max(0, math.ceil(gap + min_threshold))
            days_of_stock = (
                current_stock / (total_demand / forecast_days)
                if total_demand > 0
                else 999
            )
            urgency = (
                'CRITICAL' if days_of_stock <= 2 else
                'HIGH' if days_of_stock <= forecast_days / 2 else
                'ORDER' if gap > 0 else
                'SUFFICIENT'
            )

            results.append({
                'productId': product.get('productId'),
                'productName': product.get('productName'),
                'unit': product.get('unit', ''),
                'currentStock': current_stock,
                'totalPredictedDemand': total_demand,
                'suggestedOrderQty': suggested_qty,
                'daysOfStockLeft': round(days_of_stock, 1),
                'urgency': urgency,
            })

        urgency_order = {
            'CRITICAL': 0,
            'HIGH': 1,
            'ORDER': 2,
            'SUFFICIENT': 3,
            'UNKNOWN': 4,
        }
        results.sort(key=lambda item: urgency_order.get(item['urgency'], 4))

        return jsonify({
            'suggestions': results,
            'forecastDays': forecast_days,
        }), 200

    except (TypeError, ValueError) as error:
        return jsonify({'error': str(error)}), 400
    except Exception as error:
        app.logger.exception('Reorder logic error')
        return jsonify({'error': str(error)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
