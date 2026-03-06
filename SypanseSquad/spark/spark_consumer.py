import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, from_json, sum as _sum, count, window, avg
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, IntegerType
)

# Configuration
KAFKA_BROKER = "localhost:9092"
KAFKA_TOPIC = "ecommerce_orders"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
CHECKPOINT_DIR = os.path.join(BASE_DIR, 'checkpoints')

# Schema matching the actual CSV columns:
# InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country
# Producer sends all values as strings (safe for Kafka serialization)
ecommerce_schema = StructType([
    StructField("InvoiceNo", StringType(), True),
    StructField("StockCode", StringType(), True),
    StructField("Description", StringType(), True),
    StructField("Quantity", StringType(), True),      # cast after parsing
    StructField("InvoiceDate", StringType(), True),
    StructField("UnitPrice", StringType(), True),     # cast after parsing
    StructField("CustomerID", StringType(), True),
    StructField("Country", StringType(), True),
])

def main():
    spark = SparkSession.builder \
        .appName("EcommerceRealTimeAnalytics") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    print("Connecting to Kafka and subscribing to topic...")

    # Read streaming data from Kafka
    df_kafka = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BROKER) \
        .option("subscribe", KAFKA_TOPIC) \
        .option("startingOffsets", "latest") \
        .load()

    # Parse JSON from Kafka; use Kafka ingestion timestamp for windowing
    df_parsed = df_kafka \
        .selectExpr("CAST(value AS STRING) as json_string", "timestamp") \
        .select(from_json(col("json_string"), ecommerce_schema).alias("data"), col("timestamp")) \
        .select("data.*", "timestamp")

    # Cast numeric fields and compute revenue
    df = df_parsed \
        .withColumn("Quantity", col("Quantity").cast(IntegerType())) \
        .withColumn("UnitPrice", col("UnitPrice").cast(DoubleType())) \
        .withColumn("Revenue", col("Quantity") * col("UnitPrice"))

    # ── Analytics 1: Overall Revenue & Orders per 1-min tumbling window ──
    overall_analytics = df \
        .withWatermark("timestamp", "1 minute") \
        .groupBy(window(col("timestamp"), "1 minute")) \
        .agg(
            _sum("Revenue").alias("total_revenue"),
            count("InvoiceNo").alias("number_of_orders"),
            avg("UnitPrice").alias("avg_unit_price")
        )

    # ── Analytics 2: Top Selling Products per 1-min window ──
    top_products = df \
        .withWatermark("timestamp", "1 minute") \
        .groupBy(window(col("timestamp"), "1 minute"), col("Description")) \
        .agg(
            _sum("Quantity").alias("total_quantity_sold"),
            _sum("Revenue").alias("product_revenue")
        )

    # ── Analytics 3: Revenue by Country per 1-min window ──
    revenue_by_country = df \
        .withWatermark("timestamp", "1 minute") \
        .groupBy(window(col("timestamp"), "1 minute"), col("Country")) \
        .agg(
            _sum("Revenue").alias("country_revenue"),
            count("InvoiceNo").alias("orders_from_country")
        )

    print(f"Writing aggregated results to {OUTPUT_DIR}...")

    # Write overall analytics to CSV (two paths: spec-required 'revenue' + descriptive 'overall_analytics')
    query1 = overall_analytics.writeStream \
        .outputMode("append") \
        .format("csv") \
        .option("header", "true") \
        .option("path", os.path.join(OUTPUT_DIR, "revenue")) \
        .option("checkpointLocation", os.path.join(CHECKPOINT_DIR, "revenue")) \
        .start()

    # Write top products to CSV
    query2 = top_products.writeStream \
        .outputMode("append") \
        .format("csv") \
        .option("header", "true") \
        .option("path", os.path.join(OUTPUT_DIR, "top_products")) \
        .option("checkpointLocation", os.path.join(CHECKPOINT_DIR, "top_products")) \
        .start()

    # Write revenue by country to CSV (spec path: 'country_sales')
    query3 = revenue_by_country.writeStream \
        .outputMode("append") \
        .format("csv") \
        .option("header", "true") \
        .option("path", os.path.join(OUTPUT_DIR, "country_sales")) \
        .option("checkpointLocation", os.path.join(CHECKPOINT_DIR, "country_sales")) \
        .start()

    # Console sink for live monitoring
    query4 = top_products.writeStream \
        .outputMode("update") \
        .format("console") \
        .option("truncate", "false") \
        .start()

    print("All queries started. Press Ctrl+C to stop.")
    spark.streams.awaitAnyTermination()

if __name__ == "__main__":
    main()
