import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Eye,
  Filter,
  Ticket,
  Receipt,
  Building,
  UserPlus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Trash2,
  Printer,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';
import type { Customer, Membership, Payment, Installment, ChitGroup, PaymentReceipt, UserRole, Route } from '../../types';
import { Logo } from '../../components/Logo';

interface CustomersViewProps {
  initialCustomerId?: string;
  userRole: UserRole;
  onOpenReceipt: (receipt: PaymentReceipt) => void;
  onNavigateToGroup: (groupId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  initialCustomerId,
  userRole,
  onOpenReceipt,
  onNavigateToGroup
}) => {
  const [customers, setCustomers] = useState<(Customer & { newGroupNo?: string; chitValue?: number; month?: number })[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [selectedCustomerData, setSelectedCustomerData] = useState<{
    customer: Customer;
    memberships: Membership[];
    payments: Payment[];
    installments: Installment[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [availableGroups, setAvailableGroups] = useState<ChitGroup[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Enroll in Group Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollGroupId, setEnrollGroupId] = useState('');
  const [enrollTicketNumber, setEnrollTicketNumber] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // In-UI Delete Customer Confirmation Modal State
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<Partial<Customer & { groupId?: string; ticketNumber?: string; routeId?: string }>>({
    fullName: '',
    mobileNumber: '',
    alternateMobile: '',
    email: '',
    dob: '1990-01-01',
    gender: 'Male',
    address: '',
    city: '',
    pincode: '',
    routeId: '',
    idProofType: 'Aadhaar',
    idProofNumber: '',
    nomineeName: '',
    nomineeRelationship: 'Spouse',
    nomineeMobile: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'active',
    remarks: '',
    groupId: '',
    ticketNumber: ''
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers(
        searchQuery,
        statusFilter !== 'all' ? statusFilter : undefined,
        routeFilter !== 'all' ? routeFilter : undefined
      );
      setCustomers(data as any);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    setCurrentPage(1);
  }, [searchQuery, statusFilter, routeFilter]);

  const loadAvailableGroups = async () => {
    try {
      const groups = await api.getChitGroups();
      setAvailableGroups(groups.filter((g) => g.status !== 'Cancelled'));
      return groups;
    } catch (err) {
      return [];
    }
  };

  const loadRoutes = async () => {
    try {
      const data = await api.getRoutes();
      setRoutes(data);
    } catch (err) {
      console.error('Failed to load routes:', err);
    }
  };

  useEffect(() => {
    loadAvailableGroups();
    loadRoutes();
  }, []);

  const handleOpenAdd = async () => {
    await loadAvailableGroups();
    setEditingCustomer(null);
    setFormData({
      fullName: '',
      mobileNumber: '',
      alternateMobile: '',
      email: '',
      dob: '1990-01-01',
      gender: 'Male',
      address: '',
      city: '',
      pincode: '',
      routeId: '',
      idProofType: 'Aadhaar',
      idProofNumber: '',
      nomineeName: '',
      nomineeRelationship: 'Spouse',
      nomineeMobile: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
      googleMapLink: '',
      remarks: '',
      groupId: '',
      ticketNumber: ''
    });
    setFormError(null);
    setShowFormModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const loadCustomerDetails = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetails(true);
    try {
      const data = await api.getCustomerById(id);
      setSelectedCustomerData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (initialCustomerId) {
      loadCustomerDetails(initialCustomerId);
    }
  }, [initialCustomerId]);

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      ...c,
      routeId: c.routeId || (c as any).route_id || '',
      dob: c.dob ? String(c.dob).split('T')[0] : '',
      joiningDate: c.joiningDate ? String(c.joiningDate).split('T')[0] : '',
    });
    setFormError(null);
    setShowFormModal(true);
  };

  const handleDeleteCustomer = (c: Customer) => {
    setDeletingCustomer(c);
    setDeleteError(null);
  };

  const confirmDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteCustomer(deletingCustomer.customerId);
      setCustomers((prev) => prev.filter((item) => item.customerId !== deletingCustomer.customerId));
      if (selectedCustomerId === deletingCustomer.customerId) {
        setSelectedCustomerId(null);
        setSelectedCustomerData(null);
      }
      setDeletingCustomer(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.customerId, formData);
      } else {
        // api.createCustomer on backend automatically auto-enrolls if formData.groupId is provided
        await api.createCustomer(formData);
      }
      setShowFormModal(false);
      loadCustomers();
      if (selectedCustomerId) {
        loadCustomerDetails(selectedCustomerId);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenEnrollModal = async () => {
    try {
      const groups = await api.getChitGroups();
      setAvailableGroups(groups.filter((g) => g.status !== 'Completed' && g.status !== 'Cancelled'));
      if (groups.length > 0) setEnrollGroupId(groups[0].groupId);
      setEnrollTicketNumber('');
      setAllowDuplicate(false);
      setEnrollError(null);
      setShowEnrollModal(true);
    } catch (err: any) {
      alert('Failed to load chit groups');
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !enrollGroupId) return;

    setEnrollSubmitting(true);
    setEnrollError(null);
    try {
      await api.createMembership({
        customerId: selectedCustomerId,
        groupId: enrollGroupId,
        ticketNumber: enrollTicketNumber ? Number(enrollTicketNumber) : undefined,
        isDuplicateAllowed: allowDuplicate
      });
      setShowEnrollModal(false);
      loadCustomerDetails(selectedCustomerId);
      loadCustomers();
    } catch (err: any) {
      setEnrollError(err.message || 'Failed to enroll member in group');
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleViewReceipt = async (receiptNum: string) => {
    try {
      const res = await api.getPaymentReceipt(receiptNum);
      onOpenReceipt(res.receipt);
    } catch (err: any) {
      alert(err.message || 'Failed to load receipt');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Printable Sheet Header (hidden on screen, visible on print) */}
      <div className="hidden print:flex flex-col items-center justify-center mb-6 py-3 border-b-2 border-black">
        <Logo className="w-16 h-16 mb-2" />
        <h2 className="text-xl font-extrabold tracking-wide uppercase text-slate-900 font-serif">
          TOTAL CHIT BOOKING CUSTOMER LIST
        </h2>
      </div>

      {/* Screen Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
              Customer Directory & Chit Bookings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage subscriber KYC profiles, chit group numbers, and print total booking customer lists
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="print-customer-list-btn"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Customer List</span>
          </button>

          <button
            id="add-customer-btn"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="customer-search-input"
            type="text"
            placeholder="Search by name, New Group No, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs text-slate-500 font-medium">Route:</span>
            <select
              id="customer-route-filter"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Routes</option>
              {routes.map((rt) => (
                <option key={rt.id} value={rt.routeId || rt.id}>
                  {rt.routeId || rt.code} - {rt.routeName || rt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              id="customer-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Accounts ({customers.length})</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Customer Cards (< md) */}
      <div className="print:hidden md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
            Loading subscriber records...
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
            No customers found. Try adjusting your search query or add a new customer.
          </div>
        ) : (
          customers.map((c, idx) => (
            <div
              key={c.customerId}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      #{idx + 1} • {c.newGroupNo || c.customerId}
                    </span>
                    <span
                      className={`uppercase font-mono px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">{c.fullName}</h3>
                  <p className="text-[11px] text-slate-500">{c.gender} • Joined {c.joiningDate}</p>
                </div>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded text-[11px] shrink-0">
                  <Ticket className="w-3 h-3 text-amber-700" />
                  Value: {c.chitValue || 10} Lakhs ({c.month || 20}M)
                </span>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Contact</span>
                  <span className="font-mono text-slate-800 font-medium block">{c.mobileNumber}</span>
                  <span className="text-slate-500 text-[11px] truncate block">{c.city} - {c.pincode}</span>
                  {c.googleMapLink && (
                    <a
                      href={c.googleMapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold"
                    >
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>Map Location</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">KYC & Nominee</span>
                  <span className="font-mono text-[11px] text-slate-700 block truncate">{c.idProofType}: {c.idProofNumber}</span>
                  <span className="text-slate-500 text-[11px] truncate block">{c.nomineeName} ({c.nomineeRelationship})</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1 min-h-[36px]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteCustomer(c)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg inline-flex items-center gap-1 min-h-[36px]"
                  title="Delete Customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => loadCustomerDetails(c.customerId)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg inline-flex items-center gap-1 min-h-[36px]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Statement</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Customers Table (Matching Uploaded Document Photo Columns) */}
      <div className="bg-white rounded-xl border-2 border-slate-900 print:border-2 print:border-black shadow-xs overflow-hidden print-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse print-table">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b-2 border-slate-900 print:bg-white print:text-black print:border-b-2 print:border-black">
              <tr>
                <th className="py-2.5 px-3 text-center border-r-2 border-slate-900 print:border-r-2 print:border-black w-14 font-bold">S.No</th>
                <th className="py-2.5 px-3 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold">New Group No</th>
                <th className="py-2.5 px-4 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold">Name</th>
                <th className="py-2.5 px-4 border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold">Phone Number</th>
                <th className="py-2.5 px-3 border-r-2 border-slate-900 print:hidden font-bold">Collection Route</th>
                <th className="py-2.5 px-3 text-center border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold w-28">Chit Value</th>
                <th className="py-2.5 px-3 text-center border-r-2 border-slate-900 print:border-r-2 print:border-black font-bold w-20">Month</th>
                <th className="py-2.5 px-3 text-center border-r-2 border-slate-900 print:hidden font-bold">Status</th>
                <th className="py-2.5 px-3 text-center print:hidden font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-900 print:divide-y-2 print:divide-black">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading subscriber records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No customers found. Try adjusting your search query or add a new customer.
                  </td>
                </tr>
              ) : (
                (() => {
                  const totalPages = Math.ceil(customers.length / itemsPerPage) || 1;
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginated = customers.slice(startIndex, startIndex + itemsPerPage);

                  return paginated.map((c, idx) => {
                    const globalIdx = startIndex + idx;
                    return (
                      <tr key={c.customerId} className="hover:bg-slate-50/80 transition print:hover:bg-white border-b-2 border-slate-900 print:border-b-2 print:border-black">
                        <td className="py-2 px-3 text-center font-mono font-bold border-r-2 border-slate-900 print:border-r-2 print:border-black text-slate-900">
                          {globalIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                          {c.newGroupNo && c.newGroupNo !== '-' ? c.newGroupNo : `GRP/${String(globalIdx + 1).padStart(3, '0')}/01`}
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                          {c.fullName}
                        </td>
                        <td className="py-2 px-4 font-mono font-bold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                          <div className="flex items-center justify-between gap-1">
                            <span>{c.mobileNumber}</span>
                            <a
                              href={
                                c.googleMapLink ||
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  `${c.address}, ${c.city}, ${c.pincode}`
                                )}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition print:hidden"
                              title="Open Google Maps Location"
                            >
                              <MapPin className="w-3 h-3 text-amber-700" />
                            </a>
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r-2 border-slate-900 print:hidden">
                          {c.routeName || c.routeId ? (
                            <div>
                              <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{c.routeName || c.routeId}</span>
                              </span>
                              {c.assignedAgentName && (
                                <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                                  Agent: {c.assignedAgentName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                          {c.chitValue || 10}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r-2 border-slate-900 print:border-r-2 print:border-black">
                          {c.month || 20}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 print:hidden">
                          <span
                            className={`inline-block uppercase font-mono px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`view-customer-${c.customerId}`}
                              onClick={() => loadCustomerDetails(c.customerId)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition"
                              title="View Details & Statement"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              id={`edit-customer-${c.customerId}`}
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-customer-${c.customerId}`}
                              onClick={() => handleDeleteCustomer(c)}
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {customers.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2 font-medium text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, customers.length)} of {customers.length} subscribers
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Number Buttons */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.ceil(customers.length / itemsPerPage) || 1 }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      currentPage === pageNum
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(customers.length / itemsPerPage) || 1, p + 1))}
                disabled={currentPage === (Math.ceil(customers.length / itemsPerPage) || 1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium inline-flex items-center gap-1 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER PROFILE & STATEMENT DRAWER */}
      {selectedCustomerId && selectedCustomerData && (
        <div id="customer-drawer-backdrop" className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                    {selectedCustomerData.customer.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 truncate">{selectedCustomerData.customer.fullName}</h2>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      ID: {selectedCustomerData.customer.customerId} • Joined {selectedCustomerData.customer.joiningDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(selectedCustomerData.customer)}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg"
                    title="Edit profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
                {/* Profile Meta Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold block">Contact Info</span>
                    <p className="text-slate-900 font-medium mt-1 font-mono">{selectedCustomerData.customer.mobileNumber}</p>
                    {selectedCustomerData.customer.email && (
                      <p className="text-slate-600 break-all">{selectedCustomerData.customer.email}</p>
                    )}
                    <p className="text-slate-500 mt-1">{selectedCustomerData.customer.address}, {selectedCustomerData.customer.city} - {selectedCustomerData.customer.pincode}</p>
                    <a
                      href={
                        selectedCustomerData.customer.googleMapLink ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${selectedCustomerData.customer.address}, ${selectedCustomerData.customer.city}, ${selectedCustomerData.customer.pincode}`
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Open Location on Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-75" />
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold block">KYC & Nominee</span>
                    <p className="text-slate-900 font-medium mt-1 font-mono">
                      {selectedCustomerData.customer.idProofType}: {selectedCustomerData.customer.idProofNumber}
                    </p>
                    <p className="text-slate-700 mt-1 font-medium">
                      Nominee: {selectedCustomerData.customer.nomineeName} ({selectedCustomerData.customer.nomineeRelationship})
                    </p>
                    <p className="text-slate-500 font-mono">Ph: {selectedCustomerData.customer.nomineeMobile}</p>
                  </div>
                </div>

                {/* Collection Route & Field Agent Card */}
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                      <MapPin className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider block">Assigned Collection Route</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {selectedCustomerData.customer.routeName || selectedCustomerData.customer.routeId || 'No Route Assigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Field Agent Responsible</span>
                    <span className="font-bold text-slate-800">
                      {selectedCustomerData.customer.assignedAgentName || 'No Agent Assigned'}
                    </span>
                  </div>
                </div>

                {/* Co-Applicant & Security Guarantors Cards */}
                {(selectedCustomerData.customer.coApplicantName || selectedCustomerData.customer.security1Name || selectedCustomerData.customer.security2Name) && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Co-Applicant & Security Guarantors Database
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Co-Applicant */}
                      {selectedCustomerData.customer.coApplicantName && (
                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                          <span className="font-bold text-blue-900 block uppercase text-[10px] tracking-wider mb-1">Co-Applicant</span>
                          <p className="font-bold text-slate-900">{selectedCustomerData.customer.coApplicantName}</p>
                          {selectedCustomerData.customer.coApplicantMobile && (
                            <p className="text-slate-600 font-mono text-[11px]">{selectedCustomerData.customer.coApplicantMobile}</p>
                          )}
                          {selectedCustomerData.customer.coApplicantAddress && (
                            <p className="text-slate-500 text-[10px] mt-1">{selectedCustomerData.customer.coApplicantAddress}</p>
                          )}
                          {selectedCustomerData.customer.coApplicantMapLink && (
                            <a
                              href={selectedCustomerData.customer.coApplicantMapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              <MapPin className="w-2.5 h-2.5 text-blue-600" />
                              <span>Co-Applicant Map</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Security 1 */}
                      {selectedCustomerData.customer.security1Name && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider">Security / Guarantor 1</span>
                            {selectedCustomerData.customer.security1Photo && (
                              <img src={selectedCustomerData.customer.security1Photo} alt="Security 1" className="w-6 h-6 rounded-full object-cover border border-emerald-300" />
                            )}
                          </div>
                          <p className="font-bold text-slate-900">{selectedCustomerData.customer.security1Name}</p>
                          {selectedCustomerData.customer.security1Mobile && (
                            <p className="text-slate-600 font-mono text-[11px]">{selectedCustomerData.customer.security1Mobile}</p>
                          )}
                          {selectedCustomerData.customer.security1Address && (
                            <p className="text-slate-500 text-[10px] mt-1">{selectedCustomerData.customer.security1Address}</p>
                          )}
                          {selectedCustomerData.customer.security1MapLink && (
                            <a
                              href={selectedCustomerData.customer.security1MapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Security 1 Map</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Security 2 */}
                      {selectedCustomerData.customer.security2Name && (
                        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-purple-900 uppercase text-[10px] tracking-wider">Security / Guarantor 2</span>
                            {selectedCustomerData.customer.security2Photo && (
                              <img src={selectedCustomerData.customer.security2Photo} alt="Security 2" className="w-6 h-6 rounded-full object-cover border border-purple-300" />
                            )}
                          </div>
                          <p className="font-bold text-slate-900">{selectedCustomerData.customer.security2Name}</p>
                          {selectedCustomerData.customer.security2Mobile && (
                            <p className="text-slate-600 font-mono text-[11px]">{selectedCustomerData.customer.security2Mobile}</p>
                          )}
                          {selectedCustomerData.customer.security2Address && (
                            <p className="text-slate-500 text-[10px] mt-1">{selectedCustomerData.customer.security2Address}</p>
                          )}
                          {selectedCustomerData.customer.security2MapLink && (
                            <a
                              href={selectedCustomerData.customer.security2MapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-purple-800 bg-white border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              <MapPin className="w-2.5 h-2.5 text-purple-600" />
                              <span>Security 2 Map</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enrolled Chit Groups Section */}
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                      <Ticket className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Enrolled Chit Memberships ({selectedCustomerData.memberships.length})</span>
                    </div>
                    <button
                      onClick={handleOpenEnrollModal}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0 min-h-[36px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Enroll in Group</span>
                    </button>
                  </div>

                  {selectedCustomerData.memberships.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                      No active chit memberships for this customer.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedCustomerData.memberships.map((m) => (
                        <div
                          key={m.membershipId}
                          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{m.groupName}</span>
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                                Ticket #{m.ticketNumber}
                              </span>
                              {m.isPrized && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Prized (Month #{m.prizedAuctionNumber})
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-500 text-[11px] mt-1 font-mono">
                              <span>Chit Value: ₹{m.chitValue?.toLocaleString()}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Total Paid: ₹{m.totalPaid?.toLocaleString()}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-amber-800">Pending: ₹{m.totalPending?.toLocaleString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigateToGroup(m.groupId)}
                            className="text-xs text-amber-700 hover:underline font-semibold self-end sm:self-auto"
                          >
                            View Group →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Payment History Table */}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm mb-3">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <span>Payment Receipts Ledger</span>
                  </div>

                  {selectedCustomerData.payments.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                      No payments recorded yet for this customer.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Receipt #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Group & Ticket</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3 text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedCustomerData.payments.map((p) => (
                            <tr key={p.id || p.receiptNumber} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{p.receiptNumber}</td>
                              <td className="py-2.5 px-3 text-slate-600">{p.paymentDate}</td>
                              <td className="py-2.5 px-3 text-slate-700">{p.groupName} (T#{p.ticketNumber})</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                ₹{p.amountPaid.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{p.paymentMode}</td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => handleViewReceipt(p.receiptNumber)}
                                  className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showFormModal && (
        <div id="customer-form-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {editingCustomer ? 'Edit Customer KYC Details' : 'Register New Chit Subscriber'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Personal Info */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 text-xs uppercase tracking-wider">
                Personal Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. Anand Kumar"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobileNumber || ''}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Alternate Contact</label>
                  <input
                    type="tel"
                    value={formData.alternateMobile || ''}
                    onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-amber-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                    placeholder="subscriber@example.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Gender</label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob ? String(formData.dob).split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider">
                Address Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-medium mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. #45, 2nd Cross, Indira Nagar"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="Enter City"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="Enter Pincode"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-medium mb-1">Google Maps Location Link (Optional)</label>
                  <input
                    type="url"
                    value={formData.googleMapLink || ''}
                    onChange={(e) => setFormData({ ...formData, googleMapLink: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="e.g. https://maps.google.com/?q=12.9716,77.5946 or Location URL"
                  />
                </div>
              </div>

              {/* Collection Route Assignment */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Collection Route & Field Agent Assignment</span>
                <span className="text-[11px] text-slate-500 font-normal normal-case">
                  Routes determine which field agent collects dues
                </span>
              </div>
              <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Collection Route
                  </label>
                  <select
                    value={formData.routeId || ''}
                    onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">-- No Route Assigned (Unassigned) --</option>
                    {routes.map((rt) => (
                      <option key={rt.id} value={rt.routeId || rt.id}>
                        {rt.routeId || rt.code} - {rt.routeName || rt.name} {rt.assignedAgentName ? `(Agent: ${rt.assignedAgentName})` : '(No Agent Assigned)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Feedback on Selected Route */}
                {(() => {
                  if (!formData.routeId) {
                    return (
                      <p className="text-[11px] text-slate-500 italic">
                        Tip: Assigning a route ensures field agents will have this subscriber in their daily collection list.
                      </p>
                    );
                  }
                  const selectedRt = routes.find((r) => String(r.id) === String(formData.routeId) || r.routeId === formData.routeId);
                  if (selectedRt?.assignedAgentName) {
                    return (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Assigned Field Agent: <strong>{selectedRt.assignedAgentName}</strong> will collect installments for this subscriber.
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Note: Route <strong>{selectedRt?.routeName || selectedRt?.name || formData.routeId}</strong> currently has no field agent assigned.
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* KYC & Nominee */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider">
                KYC Identity & Nominee
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">ID Proof Type *</label>
                  <select
                    value={formData.idProofType || 'Aadhaar'}
                    onChange={(e) => setFormData({ ...formData, idProofType: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">ID Proof Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.idProofNumber || ''}
                    onChange={(e) => setFormData({ ...formData, idProofNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="e.g. 4589 1234 9876"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nominee Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.nomineeName || ''}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    placeholder="e.g. Sunita Kumar"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nominee Relationship *</label>
                  <select
                    value={formData.nomineeRelationship || 'Spouse'}
                    onChange={(e) => setFormData({ ...formData, nomineeRelationship: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* CO-APPLICANT DATABASE SECTION */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider">
                Co-Applicant Details (Google Map Link)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/40 p-3 rounded-xl border border-blue-200/60">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Co-Applicant Name</label>
                  <input
                    type="text"
                    value={formData.coApplicantName || ''}
                    onChange={(e) => setFormData({ ...formData, coApplicantName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="Full name of Co-Applicant"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Co-Applicant Mobile</label>
                  <input
                    type="tel"
                    value={formData.coApplicantMobile || ''}
                    onChange={(e) => setFormData({ ...formData, coApplicantMobile: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    placeholder="Mobile number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Co-Applicant Address & Google Maps Link</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.coApplicantAddress || ''}
                      onChange={(e) => setFormData({ ...formData, coApplicantAddress: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Street address / Landmark"
                    />
                    <input
                      type="url"
                      value={formData.coApplicantMapLink || ''}
                      onChange={(e) => setFormData({ ...formData, coApplicantMapLink: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      placeholder="Google Maps URL"
                    />
                  </div>
                </div>
              </div>

              {/* SECURITY 1 DATABASE SECTION */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider">
                Security / Guarantor 1 Details (+ Photo)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Security 1 Name</label>
                  <input
                    type="text"
                    value={formData.security1Name || ''}
                    onChange={(e) => setFormData({ ...formData, security1Name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="Guarantor 1 Name"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Security 1 Mobile</label>
                  <input
                    type="tel"
                    value={formData.security1Mobile || ''}
                    onChange={(e) => setFormData({ ...formData, security1Mobile: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    placeholder="Mobile number"
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.security1Address || ''}
                      onChange={(e) => setFormData({ ...formData, security1Address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Address"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Google Maps Link</label>
                    <input
                      type="url"
                      value={formData.security1MapLink || ''}
                      onChange={(e) => setFormData({ ...formData, security1MapLink: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      placeholder="Maps Link"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Photo Image URL</label>
                    <input
                      type="url"
                      value={formData.security1Photo || ''}
                      onChange={(e) => setFormData({ ...formData, security1Photo: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      placeholder="Photo URL"
                    />
                  </div>
                </div>
              </div>

              {/* SECURITY 2 DATABASE SECTION */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider">
                Security / Guarantor 2 Details (+ Photo)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/40 p-3 rounded-xl border border-purple-200/60">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Security 2 Name</label>
                  <input
                    type="text"
                    value={formData.security2Name || ''}
                    onChange={(e) => setFormData({ ...formData, security2Name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="Guarantor 2 Name"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Security 2 Mobile</label>
                  <input
                    type="tel"
                    value={formData.security2Mobile || ''}
                    onChange={(e) => setFormData({ ...formData, security2Mobile: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    placeholder="Mobile number"
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.security2Address || ''}
                      onChange={(e) => setFormData({ ...formData, security2Address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Address"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Google Maps Link</label>
                    <input
                      type="url"
                      value={formData.security2MapLink || ''}
                      onChange={(e) => setFormData({ ...formData, security2MapLink: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      placeholder="Maps Link"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Photo Image URL</label>
                    <input
                      type="url"
                      value={formData.security2Photo || ''}
                      onChange={(e) => setFormData({ ...formData, security2Photo: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                      placeholder="Photo URL"
                    />
                  </div>
                </div>
              </div>

              {/* Group Assignment Section (Available during creation & editing) */}
              <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 pt-2 text-xs uppercase tracking-wider">
                Chit Group Allocation (New Group No)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Assign / Add Chit Group</label>
                  <select
                    value={formData.groupId || ''}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">-- Do Not Change / Assign Later --</option>
                    {availableGroups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.groupName} ({g.groupId}) • ₹{g.chitValue.toLocaleString()} ({g.durationMonths}M)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Ticket Number (e.g. 01, 02)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.ticketNumber || ''}
                    onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="Auto-assigns next ticket"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCustomer ? 'Save Changes' : 'Register Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL CUSTOMER IN CHIT GROUP MODAL */}
      {showEnrollModal && (
        <div id="enroll-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm">Enroll Subscriber in Chit Group</h3>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {enrollError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {enrollError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Select Chit Group *</label>
                <select
                  required
                  value={enrollGroupId}
                  onChange={(e) => setEnrollGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {availableGroups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.groupName} ({g.groupId}) • ₹{g.chitValue.toLocaleString()} ({g.currentMembersCount}/{g.numMembers})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Ticket Number (Optional)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={enrollTicketNumber}
                  onChange={(e) => setEnrollTicketNumber(e.target.value)}
                  placeholder="Leave empty to auto-assign next available"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">If left blank, system assigns the next free ticket.</p>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium text-xs">Allow multiple tickets in this same chit group</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">
                  Check this if the subscriber wants to hold more than 1 ticket in this group.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {enrollSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-UI DELETE SUBSCRIBER CONFIRMATION MODAL */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Subscriber Account?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete subscriber <strong className="text-slate-900 font-semibold">{deletingCustomer.fullName}</strong> (<span className="font-mono text-amber-800 font-bold">{deletingCustomer.customerId}</span>)?
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                ⚠️ <strong>Notice:</strong> This will permanently remove this subscriber along with all their enrolled chit tickets, payments, and installment records.
              </div>

              {deleteError && (
                <div className="mt-3 p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-lg text-left font-medium">
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeletingCustomer(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteCustomer}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Subscriber</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Exact Document Photo Printing */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          nav, sidebar, header, .print\\:hidden {
            display: none !important;
          }
          table {
            border: 1.5px solid #000000 !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 6px 10px !important;
            color: #000000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}</style>
    </div>
  );
};
