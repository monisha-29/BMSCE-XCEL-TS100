"""
aggregate.py — Pre-aggregate e-commerce CSV data into CSV files for Power BI.
Run this once (or periodically) to produce Power BI-ready datasets.

Usage:
    python aggregate.py

Outputs (saved to output/powerbi/):
    summary.csv            - Single-row KPI summary
    revenue_by_country.csv - Revenue and orders per country
    top_products.csv       - Top 20 products by revenue
    revenue_over_time.csv  - Monthly revenue trend
    daily_orders.csv       - Daily order volume
    full_data.csv          - Cleaned full dataset (for custom PBI visuals)
"""

import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'data.csv')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output', 'powerbi')

os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_csv(df, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    df.to_csv(path, index=False, encoding='utf-8-sig')  # utf-8-sig for Excel/PBI compatibility
    print(f"  Saved -> {path}  ({len(df)} rows)")
    return path

def main():
    print(f"Reading {DATA_FILE}...")
    df = pd.read_csv(DATA_FILE, encoding='latin1', dtype={'CustomerID': str})

    # ── Clean data ──
    df = df.dropna(subset=['Quantity', 'UnitPrice'])
    df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(0).astype(int)
    df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce').fillna(0.0)
    df['Revenue'] = (df['Quantity'] * df['UnitPrice']).round(2)

    # Parse and enrich dates
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
    df = df.dropna(subset=['InvoiceDate'])
    df['Date'] = df['InvoiceDate'].dt.date
    df['Year'] = df['InvoiceDate'].dt.year
    df['Month'] = df['InvoiceDate'].dt.month
    df['YearMonth'] = df['InvoiceDate'].dt.to_period('M').astype(str)
    df['DayOfWeek'] = df['InvoiceDate'].dt.day_name()

    # Filter out returns (negative quantity)
    df_sales = df[df['Quantity'] > 0].copy()

    print(f"Cleaned dataset: {len(df_sales):,} sales rows (from {len(df):,} total)")
    print("Computing aggregations...")

    # ── 1. Summary KPIs (single row — use as PBI card source) ──
    summary = pd.DataFrame([{
        'TotalRevenue':     round(df_sales['Revenue'].sum(), 2),
        'TotalOrders':      df_sales['InvoiceNo'].nunique(),
        'UniqueCustomers':  df_sales['CustomerID'].dropna().nunique(),
        'UniqueProducts':   df_sales['Description'].nunique(),
        'AvgOrderValue':    round(df_sales.groupby('InvoiceNo')['Revenue'].sum().mean(), 2),
        'TotalQuantitySold': int(df_sales['Quantity'].sum()),
        'Countries':        df_sales['Country'].nunique(),
    }])
    save_csv(summary, 'summary.csv')

    # ── 2. Revenue & Orders by Country ──
    country_stats = (
        df_sales.groupby('Country')
        .agg(
            Revenue=('Revenue', 'sum'),
            Orders=('InvoiceNo', 'nunique'),
            Customers=('CustomerID', 'nunique'),
            AvgOrderValue=('Revenue', 'mean')
        )
        .round(2)
        .reset_index()
        .sort_values('Revenue', ascending=False)
    )
    save_csv(country_stats, 'revenue_by_country.csv')

    # ── 3. Top Products by Revenue ──
    top_products = (
        df_sales.groupby('Description')
        .agg(
            TotalRevenue=('Revenue', 'sum'),
            TotalQuantity=('Quantity', 'sum'),
            AvgUnitPrice=('UnitPrice', 'mean'),
            Orders=('InvoiceNo', 'nunique')
        )
        .round(2)
        .reset_index()
        .sort_values('TotalRevenue', ascending=False)
        .head(50)  # top 50 for PBI flexibility
    )
    top_products['Rank'] = range(1, len(top_products) + 1)
    save_csv(top_products, 'top_products.csv')

    # ── 4. Monthly Revenue Trend ──
    monthly = (
        df_sales.groupby(['Year', 'Month', 'YearMonth'])
        .agg(
            Revenue=('Revenue', 'sum'),
            Orders=('InvoiceNo', 'nunique'),
            Customers=('CustomerID', 'nunique')
        )
        .round(2)
        .reset_index()
        .sort_values('YearMonth')
    )
    save_csv(monthly, 'revenue_over_time.csv')

    # ── 5. Daily Order Volume ──
    daily = (
        df_sales.groupby('Date')
        .agg(
            Orders=('InvoiceNo', 'nunique'),
            Revenue=('Revenue', 'sum'),
            Quantity=('Quantity', 'sum')
        )
        .round(2)
        .reset_index()
        .sort_values('Date')
    )
    daily['Date'] = daily['Date'].astype(str)
    save_csv(daily, 'daily_orders.csv')

    # ── 6. Full Cleaned Dataset (for custom PBI visuals) ──
    full_cols = [
        'InvoiceNo', 'StockCode', 'Description', 'Quantity',
        'InvoiceDate', 'UnitPrice', 'Revenue', 'CustomerID',
        'Country', 'Date', 'Year', 'Month', 'YearMonth', 'DayOfWeek'
    ]
    save_csv(df_sales[full_cols], 'full_data.csv')

    print("\nOK All aggregations complete! Files saved to output/powerbi/")
    print(f"\n  KPI Snapshot:")
    print(f"    Total Revenue   : GBP {summary['TotalRevenue'].iloc[0]:,.2f}")
    print(f"    Total Orders    : {summary['TotalOrders'].iloc[0]:,}")
    print(f"    Unique Customers: {summary['UniqueCustomers'].iloc[0]:,}")
    print(f"    Unique Products : {summary['UniqueProducts'].iloc[0]:,}")
    print(f"    Avg Order Value : GBP {summary['AvgOrderValue'].iloc[0]:,.2f}")
    print(f"\n  Power BI Files are in: {OUTPUT_DIR}")
    print("  Open Power BI Desktop > Get Data > Text/CSV > select any file to begin.")

if __name__ == "__main__":
    main()
