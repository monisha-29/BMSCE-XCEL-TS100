import os
import time
import json
import glob
import pandas as pd
from kafka import KafkaProducer

KAFKA_BROKER = 'localhost:9092'
KAFKA_TOPIC = 'ecommerce_orders'
# Locate the data directory relative to this script
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
# Delay between messages in seconds (0.1 = 10 msgs/sec, good for demo)
STREAM_DELAY = 0.1

def json_serializer(data):
    return json.dumps(data).encode('utf-8')

def get_csv_file():
    csv_files = glob.glob(os.path.join(DATA_DIR, '*.csv'))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {DATA_DIR}. Please place your dataset there.")
    return csv_files[0]

def stream_data():
    print(f"Connecting to Kafka broker at {KAFKA_BROKER}...")
    try:
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_BROKER],
            value_serializer=json_serializer
        )
    except Exception as e:
        print(f"Error connecting to Kafka: {e}")
        return

    csv_file = get_csv_file()
    print(f"Reading from {csv_file}...")

    # Read CSV (latin1 encoding handles special chars in this dataset)
    df = pd.read_csv(csv_file, encoding='latin1', dtype=str)
    df = df.where(pd.notnull(df), None)

    print(f"Starting to stream {len(df)} rows to topic '{KAFKA_TOPIC}' (delay={STREAM_DELAY}s)...")

    sent = 0
    for index, row in df.iterrows():
        message = row.to_dict()
        try:
            producer.send(KAFKA_TOPIC, value=message)
            sent += 1
            if sent % 100 == 0:
                print(f"Sent {sent} messages...")
        except Exception as e:
            print(f"Error sending message at row {index}: {e}")

        time.sleep(STREAM_DELAY)

    producer.flush()
    print(f"Streaming completed. Total messages sent: {sent}")

if __name__ == "__main__":
    stream_data()
