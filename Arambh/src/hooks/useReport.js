// useReport hook - Manage reports
import { useState } from 'react';
import { reportAPI } from '../services/endpoints';

export function useReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate report
  const generateReport = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportAPI.generateReport(sessionId);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate report';
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  };

  // Get all reports
  const fetchReports = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportAPI.getReports(page, limit);
      setReports(response.data.data || []);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reports');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get report by ID
  const getReport = async (reportId) => {
    try {
      setLoading(true);
      const response = await reportAPI.getReportById(reportId);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportId) => {
    try {
      const response = await reportAPI.downloadReport(reportId);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download report');
      throw err;
    }
  };

  // Delete report
  const deleteReport = async (reportId) => {
    try {
      setLoading(true);
      const response = await reportAPI.deleteReport(reportId);
      setReports(reports.filter(r => r._id !== reportId));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    reports,
    loading,
    error,
    generateReport,
    fetchReports,
    getReport,
    downloadReport,
    deleteReport,
  };
}
