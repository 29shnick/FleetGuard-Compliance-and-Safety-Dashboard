import { Driver, Vehicle, Alert, ComplianceStatus } from './types';

const getStatus = (expiryDate: string): ComplianceStatus => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'NON-COMPLIANT';
  if (diffDays <= 30) return 'Warning';
  return 'Compliant';
};

export const MOCK_DRIVERS: Driver[] = [
  { id: 'D1', name: 'Nikola Shikaleski', cdlExpiry: '2026-05-15', medCertExpiry: '2026-06-20', truckId: 'TRK-101', overallStatus: getStatus('2026-05-15'), criticalViolations: 0, isHighRisk: false },
  { id: 'D2', name: 'James Wilson', cdlExpiry: '2026-04-05', medCertExpiry: '2026-04-10', truckId: 'TRK-202', overallStatus: getStatus('2026-04-05'), criticalViolations: 3, isHighRisk: true },
  { id: 'D3', name: 'Sarah Miller', cdlExpiry: '2026-03-15', medCertExpiry: '2026-03-20', truckId: 'TRK-303', overallStatus: getStatus('2026-03-15'), criticalViolations: 1, isHighRisk: false },
  { id: 'D4', name: 'Robert Brown', cdlExpiry: '2026-06-01', medCertExpiry: '2026-07-10', truckId: 'TRK-404', overallStatus: getStatus('2026-06-01'), criticalViolations: 4, isHighRisk: true },
  { id: 'D5', name: 'Linda Garcia', cdlExpiry: '2026-04-25', medCertExpiry: '2026-05-30', truckId: 'TRK-505', overallStatus: getStatus('2026-04-25'), criticalViolations: 0, isHighRisk: false },
  { id: 'D6', name: 'Michael Chen', cdlExpiry: '2026-03-01', medCertExpiry: '2026-03-15', truckId: 'TRK-606', overallStatus: getStatus('2026-03-01'), criticalViolations: 2, isHighRisk: true },
  { id: 'D7', name: 'Emily Davis', cdlExpiry: '2026-08-15', medCertExpiry: '2026-09-20', truckId: 'TRK-707', overallStatus: getStatus('2026-08-15'), criticalViolations: 0, isHighRisk: false },
  { id: 'D8', name: 'David Martinez', cdlExpiry: '2026-04-15', medCertExpiry: '2026-04-20', truckId: 'TRK-808', overallStatus: getStatus('2026-04-15'), criticalViolations: 1, isHighRisk: false },
  { id: 'D9', name: 'Jessica Taylor', cdlExpiry: '2026-10-10', medCertExpiry: '2026-11-05', truckId: 'TRK-909', overallStatus: getStatus('2026-10-10'), criticalViolations: 0, isHighRisk: false },
  { id: 'D10', name: 'Kevin Lee', cdlExpiry: '2026-03-25', medCertExpiry: '2026-04-01', truckId: 'TRK-1010', overallStatus: getStatus('2026-03-25'), criticalViolations: 5, isHighRisk: true },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'V1', unitNumber: 'TRK-101', vin: '1FVAC99283X...', inspectionExpiry: '2026-08-20', overallStatus: getStatus('2026-08-20'), maintenanceStatus: 'Up to Date', mileage: 65200, lastInspectionMileage: 60100, inspectionIntervalMiles: 10000, averageMonthlyMiles: 4000 },
  { id: 'V2', unitNumber: 'TRK-202', vin: '1FVAC11204Y...', inspectionExpiry: '2026-04-05', overallStatus: getStatus('2026-04-05'), maintenanceStatus: 'Scheduled', mileage: 124800, lastInspectionMileage: 115000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 4800 },
  { id: 'V3', unitNumber: 'TRK-303', vin: '1FVAC44592Z...', inspectionExpiry: '2026-03-15', overallStatus: getStatus('2026-03-15'), maintenanceStatus: 'Overdue', mileage: 245000, lastInspectionMileage: 232000, inspectionIntervalMiles: 12000, averageMonthlyMiles: 5000 },
  { id: 'V4', unitNumber: 'TRK-404', vin: '1FVAC88321A...', inspectionExpiry: '2026-06-01', overallStatus: getStatus('2026-06-01'), maintenanceStatus: 'Up to Date', mileage: 82000, lastInspectionMileage: 74000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 3200 },
  { id: 'V5', unitNumber: 'TRK-505', vin: '1FVAC55678B...', inspectionExpiry: '2026-04-25', overallStatus: getStatus('2026-04-25'), maintenanceStatus: 'Scheduled', mileage: 147200, lastInspectionMileage: 138000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 4200 },
  { id: 'V6', unitNumber: 'TRK-606', vin: '1FVAC66789C...', inspectionExpiry: '2026-03-01', overallStatus: getStatus('2026-03-01'), maintenanceStatus: 'Overdue', mileage: 198000, lastInspectionMileage: 185000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 5100 },
  { id: 'V7', unitNumber: 'TRK-707', vin: '1FVAC77890D...', inspectionExpiry: '2026-08-15', overallStatus: getStatus('2026-08-15'), maintenanceStatus: 'Up to Date', mileage: 44000, lastInspectionMileage: 40000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 3000 },
  { id: 'V8', unitNumber: 'TRK-808', vin: '1FVAC88901E...', inspectionExpiry: '2026-04-15', overallStatus: getStatus('2026-04-15'), maintenanceStatus: 'Scheduled', mileage: 111100, lastInspectionMileage: 102000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 4500 },
  { id: 'V9', unitNumber: 'TRK-909', vin: '1FVAC99012F...', inspectionExpiry: '2026-10-10', overallStatus: getStatus('2026-10-10'), maintenanceStatus: 'Up to Date', mileage: 98100, lastInspectionMileage: 95000, inspectionIntervalMiles: 10000, averageMonthlyMiles: 2900 },
  { id: 'V10', unitNumber: 'TRK-1010', vin: '1FVAC00123G...', inspectionExpiry: '2026-03-25', overallStatus: getStatus('2026-03-25'), maintenanceStatus: 'Overdue', mileage: 293400, lastInspectionMileage: 280000, inspectionIntervalMiles: 12000, averageMonthlyMiles: 5500 },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'A1',
    timestamp: '2026-04-01 09:00',
    type: 'Compliance',
    message: 'Medical Card for James Wilson expires in 9 days.',
    severity: 'medium',
  },
  {
    id: 'A2',
    timestamp: '2026-04-01 10:30',
    type: 'Safety',
    message: 'Robert Brown flagged for high-risk safety review (>2 critical violations).',
    severity: 'high',
  },
  {
    id: 'A3',
    timestamp: '2026-04-01 11:15',
    type: 'Maintenance',
    message: 'Vehicle TRK-303 inspection has EXPIRED.',
    severity: 'high',
  },
];
