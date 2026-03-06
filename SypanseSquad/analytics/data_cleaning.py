"""
analytics/data_cleaning.py
--------------------------
Utility module for cleaning and preprocessing the e-commerce dataset.
Called by aggregate.py; can also be run standalone for a quick data quality report.

Usage:
    python analytics/data_cleaning.py
"""

import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'data.csv')


def load_raw(filepath: str = DATA_FILE) -> pd.DataFrame:
    """Load the raw CSV (latin1 encoding, CustomerID kept as string)."""
    return pd.read_csv(filepath, encoding='latin1', dtype={'CustomerID': str})


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all cleaning steps and return a cleaned DataFrame.

    Steps:
    1. Drop rows with missing Quantity or UnitPrice
    2. Cast Quantity to int, UnitPrice to float
    3. Add Revenue column (Quantity * UnitPrice)
    4. Parse InvoiceDate to datetime; drop un-parseable rows
    5. Add helper columns: Date, Year, Month, YearMonth, DayOfWeek
    6. Separate sales (Quantity > 0) from returns (Quantity <= 0)
    """
    df = df.dropna(subset=['Quantity', 'UnitPrice']).copy()
    df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(0).astype(int)
    df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce').fillna(0.0)
    df['Revenue'] = (df['Quantity'] * df['UnitPrice']).round(2)

    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
    df = df.dropna(subset=['InvoiceDate'])

    df['Date']      = df['InvoiceDate'].dt.date
    df['Year']      = df['InvoiceDate'].dt.year
    df['Month']     = df['InvoiceDate'].dt.month
    df['YearMonth'] = df['InvoiceDate'].dt.to_period('M').astype(str)
    df['DayOfWeek'] = df['InvoiceDate'].dt.day_name()

    return df


def sales_only(df: pd.DataFrame) -> pd.DataFrame:
    """Return only positive-quantity (non-return) rows."""
    return df[df['Quantity'] > 0].copy()


def returns_only(df: pd.DataFrame) -> pd.DataFrame:
    """Return only negative-quantity (return) rows."""
    return df[df['Quantity'] <= 0].copy()


def report(df: pd.DataFrame) -> None:
    """Print a brief data quality report."""
    total = len(df)
    sales = len(sales_only(df))
    returns = total - sales
    missing_customer = df['CustomerID'].isna().sum()
    print("=" * 50)
    print("  Data Quality Report")
    print("=" * 50)
    print(f"  Total rows        : {total:,}")
    print(f"  Sales rows        : {sales:,}")
    print(f"  Return rows       : {returns:,}")
    print(f"  Missing CustomerID: {missing_customer:,}")
    print(f"  Date range        : {df['InvoiceDate'].min()} -> {df['InvoiceDate'].max()}")
    print(f"  Countries         : {df['Country'].nunique()}")
    print(f"  Unique products   : {df['Description'].nunique():,}")
    print("=" * 50)


if __name__ == '__main__':
    print(f"Loading {DATA_FILE}...")
    raw = load_raw()
    df  = clean(raw)
    report(df)
