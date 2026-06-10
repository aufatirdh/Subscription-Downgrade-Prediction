from flask import Flask, request, jsonify, render_template
import joblib
import pandas as pd
import traceback
import os

app = Flask(__name__)

# Path model
MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    'streaming_histgb_pipeline_v1_20260516.pkl'
)

model_error = None
try:
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    model = None
    model_error = str(e)
    print(f"Error loading model: {e}")

# Mapping label
LABEL_MAP = {
    0: "Non-Downgrade",
    1: "Downgrade"
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():

    if model is None:
        return jsonify({
            'error': f'Model failed to load. Details: {model_error}'
        }), 500

    try:
        data = request.json

        # ===== Input =====
        tenure_months = int(data.get('tenure_months', 0))
        monthly_watch_hours = float(data.get('monthly_watch_hours', 0.0))
        customer_support_calls = int(data.get('customer_support_calls', 0))

        device_type = data.get('device_type', 'Mobile')
        payment_method = data.get('payment_method', 'Credit Card')

        # ===== Feature Engineering =====

        watch_hours_per_month = (
            monthly_watch_hours / tenure_months
            if tenure_months > 0 else 0
        )

        support_calls_ratio = (
            customer_support_calls / tenure_months
            if tenure_months > 0 else 0
        )

        # ===== DataFrame =====
        df = pd.DataFrame([{
            'tenure_months': tenure_months,
            'monthly_watch_hours': monthly_watch_hours,
            'customer_support_calls': customer_support_calls,
            'device_type': device_type,
            'payment_method': payment_method,
            'watch_hours_per_month': watch_hours_per_month,
            'support_calls_ratio': support_calls_ratio
        }])

        # ===== Prediction =====
        prediction = int(model.predict(df)[0])

        prediction_label = LABEL_MAP.get(
            prediction,
            str(prediction)
        )

        # ===== Probability =====
        probabilities = {}

        if hasattr(model, 'predict_proba'):

            proba = model.predict_proba(df)[0]
            classes = model.classes_

            for c, p in zip(classes, proba):

                label = LABEL_MAP.get(int(c), str(c))

                probabilities[label] = round(
                    float(p) * 100,
                    2
                )

        # ===== Confidence =====
        confidence = max(probabilities.values()) if probabilities else None

        # ===== Response =====
        return jsonify({
            'success': True,

            'prediction': prediction,
            'prediction_label': prediction_label,

            'confidence': confidence,

            'probabilities': probabilities,

            'input_features': {
                'tenure_months': tenure_months,
                'monthly_watch_hours': monthly_watch_hours,
                'customer_support_calls': customer_support_calls,
                'device_type': device_type,
                'payment_method': payment_method,
                'watch_hours_per_month': round(watch_hours_per_month, 4),
                'support_calls_ratio': round(support_calls_ratio, 4)
            }
        })

    except Exception as e:

        print(traceback.format_exc())

        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    app.run(
        debug=True,
        port=5000
    )