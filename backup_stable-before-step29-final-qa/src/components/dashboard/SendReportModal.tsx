import React, { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle2, AlertCircle, Building2, FileText } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { fetchOrganizations, sendReportEmail, ApiOrganization } from '../../services/SatelliteService';

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  satelliteId?: string;
  satelliteName?: string;
}

export const SendReportModal: React.FC<SendReportModalProps> = ({
  isOpen,
  onClose,
  reportId,
  satelliteId,
  satelliteName,
}) => {
  const { activeSatelliteId, satellitesData } = useSimulation();

  const currentSatId = satelliteId || activeSatelliteId || 'SAT-001';
  const currentSat = satellitesData[currentSatId] || { name: currentSatId, id: currentSatId };
  const currentSatName = satelliteName || currentSat.name;
  const currentReportId = reportId || `REP-${currentSatId}-LATEST`;

  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ORG-ISRO');
  const [selectedContactId, setSelectedContactId] = useState<string>('CONT-001');

  const [recipientEmail, setRecipientEmail] = useState<string>('istrac.ops@isro.gov.in');
  const [recipientName, setRecipientName] = useState<string>('Mission Operations Control (ISTRAC)');
  const [ccEmails, setCcEmails] = useState<string>('flight.director@isro.gov.in');
  const [customSubject, setCustomSubject] = useState<string>('');
  const subject = customSubject || `SATSHIELD AI - Satellite Health Report - ${currentSatId}`;
  const [message, setMessage] = useState<string>(
    `Official technical health & anomaly analysis report for spacecraft ${currentSatName} (${currentSatId}). Please find the certified telemetry evaluation attached.`
  );

  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    fetchOrganizations().then((orgs) => {
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
        if (orgs[0].contacts.length > 0) {
          const first = orgs[0].contacts[0];
          setSelectedContactId(first.id);
          setRecipientEmail(first.email);
          setRecipientName(first.name);
        }
      }
    });
  }, []);

  if (!isOpen) return null;

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    const org = organizations.find((o) => o.id === orgId);
    if (org && org.contacts.length > 0) {
      const contact = org.contacts[0];
      setSelectedContactId(contact.id);
      setRecipientEmail(contact.email);
      setRecipientName(contact.name);
    }
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId);
    const org = organizations.find((o) => o.id === selectedOrgId);
    const contact = org?.contacts.find((c) => c.id === contactId);
    if (contact) {
      setRecipientEmail(contact.email);
      setRecipientName(contact.name);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingState('sending');
    setStatusMessage('Transmitting encrypted payload to authorized mission contact...');

    try {
      await sendReportEmail(
        currentReportId,
        recipientEmail,
        recipientName,
        subject,
        message
      );

      setSendingState('success');
      setStatusMessage(`Report PDF dispatched successfully to ${recipientEmail}. Verification status: SENT.`);

      setTimeout(() => {
        onClose();
        setSendingState('idle');
      }, 1600);
    } catch (err: any) {
      setSendingState('error');
      setStatusMessage(err.message || 'Failed to dispatch report email.');
    }
  };

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-2xl p-6 overflow-y-auto custom-scrollbar shadow-2xl flex flex-col justify-between"
        style={{
          background: '#000000',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(59, 130, 246, 0.2)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#080808] border border-blue-500/40 text-[#3B82F6] flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[#F1F5F9]">
                DISPATCH TELEMETRY REPORT
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Transmit authenticated technical PDF report to verified space organizations & contacts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banners */}
        {sendingState === 'sending' && (
          <div className="mb-3.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center gap-2 animate-pulse">
            <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {sendingState === 'success' && (
          <div className="mb-3.5 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {sendingState === 'error' && (
          <div className="mb-3.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSend} className="space-y-3.5 text-xs">
          {/* Step 1 & 2: Organization & Authorized Contact Picker */}
          <div className="p-3.5 rounded-xl bg-[#080808] border border-white/15 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#F1F5F9]">
              <span className="flex items-center gap-1.5 text-[#00BFFF]">
                <Building2 className="w-3.5 h-3.5" />
                <span>1. SELECT AUTHORIZED ORGANIZATION & CONTACT</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/30 font-bold">
                ✓ VERIFIED RECIPIENTS ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
                  Organization Directory
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-white/20 text-[#F1F5F9] focus:outline-none focus:border-[#00BFFF] cursor-pointer"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
                  Authorized Contact
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleContactChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111111] border border-white/20 text-[#00BFFF] font-bold focus:outline-none focus:border-[#00BFFF] cursor-pointer"
                >
                  {selectedOrg?.contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Recipient To & CC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                To (Recipient Email)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] font-mono text-xs focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                CC (Operations Copy)
              </label>
              <input
                type="text"
                value={ccEmails}
                onChange={(e) => setCcEmails(e.target.value)}
                placeholder="Optional CC emails"
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#94A3B8] font-mono text-xs focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setCustomSubject(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] font-bold text-xs focus:outline-none focus:border-[#00BFFF]"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
              Message Body
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] text-xs focus:outline-none focus:border-[#00BFFF] leading-relaxed resize-none"
            />
          </div>

          {/* Attachment Box */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[#3B82F6] flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-[#F1F5F9] font-mono text-[11px]">
                  {currentSatId}_Health_Report.pdf
                </div>
                <div className="text-[9.5px] text-[#94A3B8]">
                  9-Section Technical Diagnostic • Formatted Vector PDF Document
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-mono font-bold uppercase">
              ATTACHED
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={sendingState === 'sending'}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#F1F5F9] text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingState === 'sending'}
              className="px-5 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer flex items-center gap-2"
            >
              {sendingState === 'sending' ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>DISPATCHING...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>TRANSMIT REPORT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
