import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { BarChart2, FileText, BarChart, LineChart, FileSpreadsheet, Printer, Clock, ClipboardList, X } from 'lucide-react';
import { RHMC_LOGO_DATA_URI } from '../../assets/images/rhmcLogoDataUri';
import rhmcLogo from '../../assets/images/rhmc-logo.webp';
import { Visitor } from '../../types';
import { 
  formatManilaDateTime, 
  isSameManilaDay, 
  isWithinManilaDays, 
  isWithinManilaMonth 
} from '../../utils/dateUtils';

interface ReportsViewProps {
  visitors?: Visitor[];
}

export function ReportsView({ visitors = [] }: ReportsViewProps) {
  const [reportType, setReportType] = useState<string | null>(null);
  const [printType, setPrintType] = useState<string | null>(null);

  const handleOpenReport = (type: string) => {
    setReportType(type);
  };

  const closeReport = () => {
    setReportType(null);
  };

  const handlePrint = (customType?: string | null) => {
    const typeToPrint = customType !== undefined ? customType : reportType;
    
    flushSync(() => {
      setPrintType(typeToPrint);
    });

    try {
      // Create an isolated printing iframe to suppress browser header/footer URLs completely
      const printContainer = document.getElementById('printable-report');
      if (!printContainer) {
        window.print();
        return;
      }

      const existingFrame = document.getElementById('report-print-iframe');
      if (existingFrame) {
        existingFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'report-print-iframe';
      iframe.src = 'about:blank';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        window.print();
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title></title>
            <style>
              @page {
                size: auto;
                margin: 0 !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              a, a:visited {
                text-decoration: none !important;
                color: inherit !important;
              }
              a[href]:after, a[href]::after {
                content: "" !important;
                display: none !important;
              }
              body {
                margin: 0 !important;
                padding: 14mm 16mm 14mm 16mm !important;
                background: #ffffff;
                color: #1e293b;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .header {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding-bottom: 12px;
                margin-bottom: 14px;
                border-bottom: 2px solid #cbd5e1;
                page-break-after: avoid;
                break-after: avoid;
              }
              .header-content {
                display: flex;
                align-items: center;
                gap: 14px;
              }
              .logo-img {
                width: 52px;
                height: 52px;
                max-width: 52px;
                max-height: 52px;
                object-fit: contain;
                flex-shrink: 0;
                display: block;
              }
              .college-info {
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .college-name {
                font-size: 20px;
                font-weight: 700;
                color: #0f172a;
                letter-spacing: -0.015em;
                line-height: 1.25;
              }
              .college-sub {
                font-size: 11px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-top: 3px;
              }
              .report-title-section {
                text-align: center;
                margin-bottom: 14px;
                page-break-after: avoid;
                break-after: avoid;
              }
              .report-title {
                font-size: 18px;
                font-weight: 800;
                color: #0f172a;
                letter-spacing: 0.05em;
                text-transform: uppercase;
              }
              table {
                width: 100%;
                text-align: left;
                border-collapse: collapse;
                page-break-inside: auto;
              }
              thead {
                display: table-header-group;
              }
              tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              th {
                padding: 9px 8px;
                font-size: 11px;
                font-weight: 700;
                color: #0f172a;
                border-top: 1px solid #cbd5e1;
                border-bottom: 2px solid #cbd5e1;
                background-color: #f8fafc;
                text-transform: uppercase;
                letter-spacing: 0.025em;
              }
              td {
                padding: 8px 8px;
                font-size: 12px;
                color: #334155;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
              }
              .font-mono {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              }
              .font-semibold {
                font-weight: 600;
              }
              .font-medium {
                font-weight: 500;
              }
              .text-dark {
                color: #0f172a;
              }
              .text-center {
                text-align: center;
              }
            </style>
          </head>
          <body>
            ${printContainer.innerHTML}
          </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      if (frameDoc.title) {
        frameDoc.title = '';
      }

      const triggerPrint = () => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          iframe.remove();
        }, 2000);
      };

      // Check if all images inside iframe are already loaded/decoded
      const imgs = Array.from(frameDoc.images);
      if (imgs.length === 0) {
        setTimeout(triggerPrint, 200);
      } else {
        let loadedCount = 0;
        const total = imgs.length;
        const onDone = () => {
          loadedCount++;
          if (loadedCount >= total) {
            setTimeout(triggerPrint, 150);
          }
        };

        imgs.forEach(img => {
          if (img.complete && img.naturalWidth > 0) {
            onDone();
          } else {
            img.onload = onDone;
            img.onerror = onDone;
          }
        });

        // Safety fallback timeout
        setTimeout(() => {
          if (loadedCount < total) {
            triggerPrint();
          }
        }, 1000);
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print():', err);
      if (typeof window !== 'undefined') {
        const prevTitle = document.title;
        document.title = '';
        window.focus();
        window.print();
        setTimeout(() => {
          document.title = prevTitle || 'SVLMS';
        }, 1000);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Visitor ID', 'Name', 'Type', 'ID Type', 'Contact', 'Visits', 'Status', 'Date/Time'];
    const rows = visitors.map(v => {
      const idFormatted = v.idNumber 
        ? (v.idNumber.startsWith('#') ? v.idNumber : `#${String(v.idNumber).padStart(4, '0')}`)
        : `#${String(v.id).padStart(4, '0')}`;
      const visitsCount = v.history ? v.history.length : (v.status === 'pre-registered' ? 0 : 1);
      const statusLabel = (v.status as string) === 'signed-in' || (v.status as string) === 'inside'
        ? 'Inside'
        : v.status === 'pre-registered'
        ? 'Pre-Registered'
        : 'Left';
      
      return [
        `"${idFormatted}"`,
        `"${(v.name || '').replace(/"/g, '""')}"`,
        `"${(v.visitorType || 'Guest').replace(/"/g, '""')}"`,
        `"${(v.idType || 'School ID').replace(/"/g, '""')}"`,
        `"${(v.contactNumber || '').replace(/"/g, '""')}"`,
        visitsCount,
        `"${statusLabel}"`,
        `"${formatManilaDateTime(v.signInTime)}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitor-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderReportModal = () => {
    if (!reportType) return null;

    // Filter based on Philippine time periods
    const filteredVisitors = visitors.filter(v => {
      const time = v.signInTime;
      if (reportType === 'Daily') {
        return isSameManilaDay(time) || (Array.isArray(v.history) && v.history.some(h => isSameManilaDay(h.signInTime)));
      }
      if (reportType === 'Weekly') {
        return isWithinManilaDays(time, 7) || (Array.isArray(v.history) && v.history.some(h => isWithinManilaDays(h.signInTime, 7)));
      }
      if (reportType === 'Monthly') {
        return isWithinManilaMonth(time) || (Array.isArray(v.history) && v.history.some(h => isWithinManilaMonth(h.signInTime)));
      }
      return true;
    });

    const totalVisitors = filteredVisitors.length;
    const currentlyInside = filteredVisitors.filter(v => v.status === 'signed-in').length;
    const visitsInPeriod = filteredVisitors.reduce((sum, v) => {
      if (!v.history || v.history.length === 0) return sum + (v.status === 'pre-registered' ? 0 : 1);
      if (reportType === 'Daily') {
        return sum + v.history.filter(h => isSameManilaDay(h.signInTime)).length;
      }
      if (reportType === 'Weekly') {
        return sum + v.history.filter(h => isWithinManilaDays(h.signInTime, 7)).length;
      }
      if (reportType === 'Monthly') {
        return sum + v.history.filter(h => isWithinManilaMonth(h.signInTime)).length;
      }
      return sum + v.history.length;
    }, 0);
    const frequentVisitors = filteredVisitors.filter(v => (v.history ? v.history.length : (v.status === 'pre-registered' ? 0 : 1)) > 1).length;

    const title = `${reportType} Visitor Report`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm p-4 no-print">
        <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[400px] shadow-2xl flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-main-fg">{title}</h2>
            <button onClick={closeReport} className="text-icon-fg hover:text-heading-fg transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <span className="text-label-fg text-sm font-medium">Total Visitors</span>
              <span className="text-main-fg font-bold">{totalVisitors}</span>
            </div>
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <span className="text-label-fg text-sm font-medium">Currently Inside</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentlyInside}</span>
            </div>
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <span className="text-label-fg text-sm font-medium">Visits in period</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{visitsInPeriod}</span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-label-fg text-sm font-medium">Frequent Visitors</span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">{frequentVisitors}</span>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button 
              onClick={closeReport}
              className="px-4 py-2 border border-app-border text-label-fg hover:bg-hover-bg text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
            <button 
              onClick={() => {
                const currentType = reportType;
                closeReport();
                handlePrint(currentType);
              }}
              className="px-4 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Active printable report calculation (based on printType)
  const printableVisitors = visitors.filter(v => {
    const time = v.signInTime;
    if (printType === 'Daily') {
      return isSameManilaDay(time) || (Array.isArray(v.history) && v.history.some(h => isSameManilaDay(h.signInTime)));
    }
    if (printType === 'Weekly') {
      return isWithinManilaDays(time, 7) || (Array.isArray(v.history) && v.history.some(h => isWithinManilaDays(h.signInTime, 7)));
    }
    if (printType === 'Monthly') {
      return isWithinManilaMonth(time) || (Array.isArray(v.history) && v.history.some(h => isWithinManilaMonth(h.signInTime)));
    }
    return true;
  });

  const printableTitle = printType ? `${printType.toUpperCase()} VISITOR REPORT` : 'VISITOR REPORT';

  return (
    <>
      <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden flex flex-col min-h-[500px] no-print">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-main-fg">Reports</h2>
          </div>
          <span className="text-sm font-medium text-muted-fg">Visitor analytics & exports</span>
        </div>
        
        <div className="p-6 border-b border-app-border">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-label-fg" />
            <h3 className="text-sm font-semibold text-main-fg">Generate & Export</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => handleOpenReport('Daily')}
              className="flex items-center gap-2 px-4 py-2 bg-app-bg border border-app-border hover:bg-hover-bg text-label-fg rounded-lg text-sm font-medium transition-colors"
            >
              <BarChart size={16} className="text-emerald-600 dark:text-emerald-400" />
              Daily
            </button>
            <button 
              onClick={() => handleOpenReport('Weekly')}
              className="flex items-center gap-2 px-4 py-2 bg-app-bg border border-app-border hover:bg-hover-bg text-label-fg rounded-lg text-sm font-medium transition-colors"
            >
              <LineChart size={16} className="text-orange-600 dark:text-orange-400" />
              Weekly
            </button>
            <button 
              onClick={() => handleOpenReport('Monthly')}
              className="flex items-center gap-2 px-4 py-2 bg-app-bg border border-app-border hover:bg-hover-bg text-label-fg rounded-lg text-sm font-medium transition-colors"
            >
              <LineChart size={16} className="text-blue-600 dark:text-blue-400" />
              Monthly
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors ml-1 shadow-sm"
            >
              <FileSpreadsheet size={16} />
              CSV
            </button>
            <button 
              onClick={() => handlePrint(null)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-label-fg" />
            <h3 className="text-sm font-semibold text-main-fg">Recent Activity</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-muted-fg py-10">
            <ClipboardList size={40} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">No recent activity yet.</p>
          </div>
        </div>
        
        {renderReportModal()}
      </div>

      {/* Printable Visitor Report Document */}
      <div id="printable-report" className="hidden print:block font-sans text-slate-800 p-8 bg-white max-w-4xl mx-auto">
        {/* Printable Report Header: College Logo on LEFT, College Name beside Logo */}
        <div className="header flex items-center justify-between pb-3.5 mb-4 border-b-2 border-slate-300">
          <div className="header-content flex items-center gap-3.5">
            <img 
              src={RHMC_LOGO_DATA_URI || rhmcLogo} 
              alt="Rosemont Hills Montessori College Logo" 
              className="logo-img h-14 w-14 object-contain flex-shrink-0"
              width="56"
              height="56"
            />
            <div className="college-info flex flex-col justify-center">
              <span className="college-name text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Rosemont Hills Montessori College
              </span>
              <span className="college-sub text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                School Visitor Log Management System
              </span>
            </div>
          </div>
        </div>

        {/* Report Title Section */}
        <div className="report-title-section text-center mb-4">
          <h1 className="report-title text-lg font-extrabold text-slate-900 tracking-wider uppercase">
            {printableTitle}
          </h1>
        </div>

        {/* Visitor Records Table - Moved upward directly beneath title */}
        <table className="w-full text-left border-collapse report-table">
          <thead>
            <tr className="border-t border-b-2 border-slate-300 text-slate-900 text-xs font-bold uppercase tracking-wider bg-slate-50">
              <th className="py-2.5 px-2 w-[11%]">Visitor ID</th>
              <th className="py-2.5 px-2 w-[18%]">Name</th>
              <th className="py-2.5 px-2 w-[10%]">Type</th>
              <th className="py-2.5 px-2 w-[11%]">ID Type</th>
              <th className="py-2.5 px-2 w-[12%]">Contact</th>
              <th className="py-2.5 px-2 w-[12%]">Time-In</th>
              <th className="py-2.5 px-2 w-[12%]">Time-Out</th>
              <th className="py-2.5 px-2 w-[6%] text-center">Visits</th>
              <th className="py-2.5 px-2 w-[8%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
            {printableVisitors.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                  No visitor records found for this reporting period.
                </td>
              </tr>
            ) : (
              printableVisitors.map((visitor) => {
                const idFormatted = visitor.idNumber 
                  ? (visitor.idNumber.startsWith('#') ? visitor.idNumber : `#${String(visitor.idNumber).padStart(4, '0')}`)
                  : `#${String(visitor.id).padStart(4, '0')}`;
                  
                const visitsCount = visitor.history 
                  ? visitor.history.length 
                  : (visitor.status === 'pre-registered' ? 0 : 1);

                const statusLabel = (visitor.status as string) === 'signed-in' || (visitor.status as string) === 'inside'
                  ? 'Inside'
                  : visitor.status === 'pre-registered'
                  ? 'Pre-Registered'
                  : 'Left';

                const timeInFormatted = visitor.signInTime ? formatManilaDateTime(visitor.signInTime) : '—';
                const timeOutFormatted = visitor.signOutTime ? formatManilaDateTime(visitor.signOutTime) : (statusLabel === 'Inside' ? 'Inside Campus' : '—');

                return (
                  <tr key={visitor.id} className="align-middle">
                    <td className="py-2.5 px-2 font-mono font-semibold text-slate-900">{idFormatted}</td>
                    <td className="py-2.5 px-2 font-semibold text-slate-900">{visitor.name}</td>
                    <td className="py-2.5 px-2">{visitor.visitorType || 'Guest'}</td>
                    <td className="py-2.5 px-2">{visitor.idType || 'School ID'}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-600">{visitor.contactNumber || '—'}</td>
                    <td className="py-2.5 px-2 text-slate-700">{timeInFormatted}</td>
                    <td className="py-2.5 px-2 text-slate-700">{timeOutFormatted}</td>
                    <td className="py-2.5 px-2 text-center font-medium">{visitsCount}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        statusLabel === 'Inside' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : statusLabel === 'Pre-Registered'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

