import pandas as pd
from datetime import datetime, timedelta

def calculate_compliance_status(expiry_date_str):
    """
    PM Skill: Risk Mitigation
    Logic to categorize compliance risk based on temporal proximity.
    """
    if not expiry_date_str:
        return "Missing"
    
    expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d')
    today = datetime.now()
    days_until_expiry = (expiry_date - today).days
    
    if days_until_expiry < 0:
        return "Expired"
    elif days_until_expiry <= 30:
        return "Expiring Soon"
    else:
        return "Valid"

def process_fleet_data(csv_path):
    """
    PM Skill: Data-Driven Decision Making
    Processes raw fleet data to identify high-risk drivers.
    """
    df = pd.read_csv(csv_path)
    
    # Apply compliance logic
    df['medical_card_status'] = df['medical_card_expiry'].apply(calculate_compliance_status)
    df['inspection_status'] = df['inspection_expiry'].apply(calculate_compliance_status)
    
    # Risk Analysis: Flag drivers with > 2 critical violations
    # Assuming 'violations' is a list or count in the dataset
    df['high_risk_flag'] = df['critical_violations'] > 2
    
    return df

def simulate_alert_trigger(driver_name, status, item_name):
    """
    PM Skill: Operational Automation
    Simulates an automated notification system.
    """
    if status == "Expired":
        print(f"ALERT: [SYSTEM] Automated Email Sent to {driver_name}")
        print(f"SUBJECT: URGENT: {item_name} has EXPIRED.")
        return True
    return False

# Example Usage
if __name__ == "__main__":
    # Mock data for demonstration
    data = {
        'driver_name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
        'medical_card_expiry': ['2026-05-01', '2026-04-10', '2026-03-01'],
        'inspection_expiry': ['2026-06-01', '2026-03-15', '2026-02-01'],
        'critical_violations': [0, 1, 3]
    }
    df = pd.DataFrame(data)
    
    # Process and display
    for index, row in df.iterrows():
        med_status = calculate_compliance_status(row['medical_card_expiry'])
        insp_status = calculate_compliance_status(row['inspection_expiry'])
        
        print(f"Driver: {row['driver_name']}")
        print(f" - Med Card: {med_status}")
        print(f" - Inspection: {insp_status}")
        
        # Trigger automation
        simulate_alert_trigger(row['driver_name'], med_status, "Medical Card")
        
        if row['critical_violations'] > 2:
            print(f" !!! HIGH RISK: Driver {row['driver_name']} flagged for safety review.")
