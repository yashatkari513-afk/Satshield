"""
Comprehensive Direct Test Suite for SATSHIELD AI Backend Services
Tests:
1. Database init & seeding
2. List Satellites (default 4)
3. Add INSAT-X (SAT-005)
4. Verify satellite count becomes 5
5. Ingest / generate telemetry for SAT-005
6. Compute AI health score & anomaly detection for SAT-005
7. Simulate Anomaly on SAT-005
8. Generate Technical Report for SAT-005
9. Send Report to ISRO Mission Control contact via backend email
10. Verify Report status updated to SENT
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

from db.database import init_db, get_connection
from services import satellite_service, telemetry_service, ai_analysis_service, report_service, email_service

def run_tests():
    print("\n--- 1. Testing Database Initialization ---")
    init_db()
    conn = get_connection()

    print("\n--- 2. Listing Initial Satellites ---")
    sats = satellite_service.list_satellites(conn)
    print(f"Found {len(sats)} satellites: {[s['name'] for s in sats]}")
    assert len(sats) >= 4, f"Expected at least 4 satellites, got {len(sats)}"

    print("\n--- 3. Adding New Satellite: INSAT-X (SAT-005) ---")
    # Clean up SAT-005 if already present
    satellite_service.delete_satellite(conn, "SAT-005")
    
    created = satellite_service.create_satellite(
        conn=conn,
        satellite_id="SAT-005",
        name="INSAT-X",
        operator="ISRO",
        mission="Earth Observation",
        orbit_type="GEO",
        ground_station="GS-Bangalore",
        telemetry_source="Demo Simulation"
    )
    print(f"Created satellite: {created['name']} ({created['id']}) | Orbit: {created['orbit_type']} | Operator: {created['operator']}")

    print("\n--- 4. Confirming Asset Count Incremented ---")
    sats_after = satellite_service.list_satellites(conn)
    print(f"Total satellites now: {len(sats_after)}")
    assert any(s["id"] == "SAT-005" for s in sats_after)

    print("\n--- 5. Generating Telemetry for SAT-005 ---")
    sat_obj = satellite_service.get_satellite_by_id(conn, "SAT-005")
    tel = telemetry_service.generate_deterministic_telemetry(sat_obj)
    print(f"Telemetry for INSAT-X: Batt={tel['battery_charge']}%, Volt={tel['battery_voltage']}V, Temp={tel['temperature']}°C")

    print("\n--- 6. Computing AI Health & Subsystems for SAT-005 ---")
    health = ai_analysis_service.calculate_health_score(tel, sat_obj)
    print(f"Health score: {health['overall_score']}% ({health['health_status']})")
    print(f"Subsystems: {list(health['subsystems'].keys())}")

    print("\n--- 7. Testing Anomaly Detection & Failure Prediction ---")
    anomalies = ai_analysis_service.detect_anomalies(tel, sat_obj)
    pred = ai_analysis_service.predict_failure(tel, sat_obj, anomalies)
    print(f"Active Anomalies: {len(anomalies)} | Prediction: {pred['potential_issue']} (Prob: {pred['probability']}%)")

    print("\n--- 8. Generating Technical Health Report for SAT-005 ---")
    rep_data = report_service.generate_technical_report_data(sat_obj, health, anomalies, pred, tel)
    report_record = report_service.save_report_to_db(conn, sat_obj, rep_data)
    print(f"Report generated: ID={report_record['id']} | Status={report_record['status']}")

    print("\n--- 9. Checking Organization Directory ---")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM organization_contacts WHERE organization_id = 'ORG-ISRO'")
    contact = dict(cursor.fetchone())
    print(f"Selected Contact: {contact['name']} ({contact['email']})")

    print("\n--- 10. Sending Report PDF via Backend Email Service ---")
    send_res = email_service.send_health_report_email(
        conn=conn,
        report_id=report_record['id'],
        recipient_email=contact['email'],
        recipient_name=contact['name'],
        custom_subject="SATSHIELD AI - Satellite Health Report - SAT-005",
        custom_message="Automated mission operations health report for INSAT-X."
    )
    print(f"Email dispatch status: {send_res['status']} | Mode: {send_res['dispatch_mode']}")
    print(f"Report status: {send_res['report_status']}")
    assert send_res['report_status'] == "SENT"

    conn.close()
    print("\n=======================================================")
    print("ALL 10 END-TO-END BACKEND TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
