# A real, interactive data dashboard - the exact shape of app Streamlit is
# actually used for in industry: turn a CSV/dataframe into something a
# non-technical stakeholder can filter and explore themselves, without
# building a custom frontend. Every widget below (the filters, the KPIs,
# the charts) re-runs this ENTIRE script top-to-bottom on every interaction -
# that "just a script, but interactive" model is Streamlit's whole idea.

import streamlit as st
import pandas as pd

st.set_page_config(page_title="Sales Dashboard", layout="wide")

st.title("Sales Dashboard")
st.caption("A real, filterable data app - built from a plain CSV, no custom frontend written.")


@st.cache_data
def load_data():
    # @st.cache_data means this only actually re-reads the CSV once, even
    # though the whole script re-runs on every filter change - without it,
    # every single interaction would re-read the file from disk, which
    # matters a lot once this is a real database query instead of a CSV.
    df = pd.read_csv("sales_data.csv", parse_dates=["date"])
    return df


df = load_data()

# --- Sidebar filters - real, stateful widgets that drive everything below ---
st.sidebar.header("Filters")

categories = sorted(df["category"].unique())
selected_categories = st.sidebar.multiselect(
    "Category", categories, default=categories
)

regions = sorted(df["region"].unique())
selected_regions = st.sidebar.multiselect("Region", regions, default=regions)

min_date, max_date = df["date"].min(), df["date"].max()
date_range = st.sidebar.date_input(
    "Date range", value=(min_date, max_date), min_value=min_date, max_value=max_date
)

filtered = df[
    df["category"].isin(selected_categories)
    & df["region"].isin(selected_regions)
    & (df["date"] >= pd.Timestamp(date_range[0]))
    & (df["date"] <= pd.Timestamp(date_range[1]))
]

# --- KPI row ---
col1, col2, col3 = st.columns(3)
col1.metric("Total revenue", f"${filtered['revenue'].sum():,.2f}")
col2.metric("Total units sold", f"{filtered['units'].sum():,}")
col3.metric(
    "Avg order value",
    f"${(filtered['revenue'].sum() / max(len(filtered), 1)):,.2f}",
)

st.divider()

# --- Charts - real, live-updating on every filter change above ---
left, right = st.columns(2)

with left:
    st.subheader("Revenue over time")
    daily = filtered.groupby("date")["revenue"].sum()
    st.line_chart(daily)

with right:
    st.subheader("Revenue by category")
    by_category = filtered.groupby("category")["revenue"].sum().sort_values(ascending=False)
    st.bar_chart(by_category)

st.subheader("Revenue by region")
by_region = filtered.groupby("region")["revenue"].sum().sort_values(ascending=False)
st.bar_chart(by_region)

st.divider()

# --- Raw data, with a real, working download button ---
st.subheader("Filtered raw data")
st.dataframe(filtered, use_container_width=True)

st.download_button(
    "Download filtered data as CSV",
    data=filtered.to_csv(index=False),
    file_name="filtered_sales.csv",
    mime="text/csv",
)

st.caption(f"Showing {len(filtered)} of {len(df)} total rows.")
