import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

# Step 1 & 2: Data Architecture & Backend Logic
def load_and_process_data():
    df = pd.read_csv('fleet_data.csv')
    today = datetime.now()
    
    # Convert to datetime
    df['CDL Expiration'] = pd.to_datetime(df['CDL Expiration'])
    df['Med Cert Expiration'] = pd.to_datetime(df['Med Cert Expiration'])
    df['Last Inspection'] = pd.to_datetime(df['Last Inspection'])
    
    # Inspection Expiry (1 year after last inspection)
    df['Inspection Expiry'] = df['Last Inspection'] + timedelta(days=365)
    
    def get_compliance_status(expiry_date):
        diff = (expiry_date - today).days
        if diff < 0:
            return 'NON-COMPLIANT'
        elif diff <= 30:
            return 'Warning'
        else:
            return 'Compliant'

    # Apply logic to all critical documents
    df['CDL Status'] = df['CDL Expiration'].apply(get_compliance_status)
    df['Med Status'] = df['Med Cert Expiration'].apply(get_compliance_status)
    df['Insp Status'] = df['Inspection Expiry'].apply(get_compliance_status)
    
    # Overall Entity Status
    def get_overall(row):
        statuses = [row['CDL Status'], row['Med Status'], row['Insp Status']]
        if 'NON-COMPLIANT' in statuses: return 'NON-COMPLIANT'
        if 'Warning' in statuses: return 'Warning'
        return 'Compliant'
    
    df['Overall Status'] = df.apply(get_overall, axis=1)
    return df

# Step 3: Frontend Interface (Streamlit)
def main():
    st.set_page_config(page_title="Fleet Compliance Dashboard", layout="wide")
    st.title("🚛 Fleet Compliance & Safety Audit Dashboard")
    st.markdown("---")

    df = load_and_process_data()

    # KPI Metrics
    total_drivers = len(df)
    expired_docs = len(df[df['Overall Status'] == 'NON-COMPLIANT'])
    compliant_count = len(df[df['Overall Status'] == 'Compliant'])
    health_pct = (compliant_count / total_drivers) * 100

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Drivers", total_drivers)
    col2.metric("Expired Docs", expired_docs, delta_color="inverse")
    col3.metric("Fleet Health %", f"{health_pct:.1f}%")

    # Filtering Sidebar
    st.sidebar.header("Filter Options")
    status_filter = st.sidebar.multiselect(
        "Filter by Status",
        options=['Compliant', 'Warning', 'NON-COMPLIANT'],
        default=['Warning', 'NON-COMPLIANT']
    )

    filtered_df = df[df['Overall Status'].isin(status_filter)]

    # Data Table with Color Coding
    st.subheader("Upcoming Expirations & Compliance Roster")
    
    def color_status(val):
        color = 'white'
        if val == 'NON-COMPLIANT': color = '#ff4b4b'
        elif val == 'Warning': color = '#ffa500'
        elif val == 'Compliant': color = '#00c853'
        return f'background-color: {color}; color: white; font-weight: bold'

    st.dataframe(
        filtered_df.style.applymap(color_status, subset=['CDL Status', 'Med Status', 'Insp Status', 'Overall Status']),
        use_container_width=True
    )

if __name__ == "__main__":
    main()
