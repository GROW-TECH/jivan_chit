import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  ShieldAlert,
  BadgeCheck,
  Building,
  RefreshCw,
  Wallet,
  Clock,
  Eye,
  FileText
} from 'lucide-react';
import { api } from '../../api/client';
import type { Route, Customer, User, DailyHandover, UserRole } from '../../types';

interface RoutesViewProps {
  userRole: UserRole;
  currentUserId?: string | number;
}

export const RoutesView: React.FC<RoutesViewProps> = ({ userRole }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [handovers, setHandovers] = useState<DailyHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'routes' | 'handovers'>('routes');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add / Edit Route Modal
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeName, setRouteName] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Salem');
  const [subLocalities, setSubLocalities] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState<string>('');
  const [routeStatus, setRouteStatus] = useState<'active' | 'inactive'>('active');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // View Customers Modal
  const [viewingRoute, setViewingRoute] = useState<Route | null>(null);
  const [routeCustomers, setRouteCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Handover Verification
  const [verifyingHandover, setVerifyingHandover] = useState<DailyHandover | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [handoverActionLoading, setHandoverActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesData, usersData, handoversData] = await Promise.all([
        api.getRoutes(),
        api.getUsers(),
        api.getDailyHandovers()
      ]);
      setRoutes(routesData);
      setAgents(usersData.filter((u) => u.role === 'agent' && u.status === 'active'));
      setHandovers(handoversData);
    } catch (err) {
      console.error('[RoutesView] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingRoute(null);
    setRouteName('');
    setArea('');
    setCity('Salem');
    setSubLocalities('');
    setAssignedAgentId('');
    setRouteStatus('active');
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (route: Route) => {
    setEditingRoute(route);
    setRouteName(route.routeName);
    setArea(route.area);
    setCity(route.city || 'Salem');
    setSubLocalities(route.subLocalities || '');
    setAssignedAgentId(route.assignedAgentId ? String(route.assignedAgentId) : '');
    setRouteStatus(route.status);
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !area.trim()) {
      setModalError('Route Name and Area are required.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const payload: Partial<Route> = {
        routeName: routeName.trim(),
        area: area.trim(),
        city: city.trim() || 'Salem',
        subLocalities: subLocalities.trim() || undefined,
        assignedAgentId: assignedAgentId ? Number(assignedAgentId) : undefined,
        status: routeStatus
      };

      if (editingRoute) {
        await api.updateRoute(editingRoute.id, payload);
      } else {
        await api.createRoute(payload);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save route. Please try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const [deletingRoute, setDeletingRoute] = useState<Route | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteRoute = (route: Route) => {
    setDeletingRoute(route);
    setDeleteError(null);
  };

  const confirmDeleteRoute = async () => {
    if (!deletingRoute) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteRoute(deletingRoute.id);
      await loadData();
      setDeletingRoute(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete route.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewCustomers = async (route: Route) => {
    setViewingRoute(route);
    setLoadingCustomers(true);
    try {
      const custs = await api.getRouteCustomers(route.routeId);
      setRouteCustomers(custs);
    } catch (err) {
      console.error(err);
      setRouteCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleVerifyHandover = async (handover: DailyHandover, status: 'verified' | 'rejected') => {
    try {
      setHandoverActionLoading(true);
      await api.verifyDailyHandover(handover.id, status, verificationNotes);
      setVerifyingHandover(null);
      setVerificationNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to verify handover.');
    } finally {
      setHandoverActionLoading(false);
    }
  };

  // Filtered routes
  const filteredRoutes = routes.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.routeId.toLowerCase().includes(q) ||
        r.routeName.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        (r.subLocalities && r.subLocalities.toLowerCase().includes(q)) ||
        (r.assignedAgentName && r.assignedAgentName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalAssignedCustomers = routes.reduce((sum, r) => sum + (r.customerCount || 0), 0);
  const pendingHandoversCount = handovers.filter((h) => h.status === 'submitted').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20 shrink-0">
            <MapPin className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
              Collection Routes Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign field collection agents to geographic routes in Salem for cross-group chit collections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Route</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Routes</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{routes.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {routes.filter((r) => r.status === 'active').length} active in Salem
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Agent Coverage</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <BadgeCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {routes.filter((r) => !!r.assignedAgentId).length} / {routes.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {routes.filter((r) => !r.assignedAgentId).length > 0 ? (
              <span className="text-amber-600 font-semibold">
                {routes.filter((r) => !r.assignedAgentId).length} routes unassigned
              </span>
            ) : (
              '100% routes assigned'
            )}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Subscribers on Routes</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalAssignedCustomers}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across all chit groups</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Daily Cash Handovers</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{handovers.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingHandoversCount > 0 ? (
              <span className="text-amber-600 font-bold">
                {pendingHandoversCount} pending cashier verification
              </span>
            ) : (
              'All handovers verified'
            )}
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('routes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'routes'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Collection Routes ({routes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('handovers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'handovers'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Daily Cash Handovers</span>
          {pendingHandoversCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-900 font-black">
              {pendingHandoversCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'routes' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search route name, area, agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by Status"
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Status</option>
                <option value="active">Active Routes</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Routes Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-amber-600 mb-2" />
                <span className="text-xs">Loading collection routes...</span>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">No collection routes found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Add New Route" above to create a collection route in Salem.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Route ID</th>
                      <th className="py-3.5 px-4">Route Name & Area</th>
                      <th className="py-3.5 px-4">Sub-localities</th>
                      <th className="py-3.5 px-4">Assigned Agent</th>
                      <th className="py-3.5 px-4 text-center">Customers</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoutes.map((route) => {
                      const localities = (route.subLocalities || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);

                      return (
                        <tr key={route.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-800 whitespace-nowrap">
                            <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                              {route.routeId}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 text-xs">{route.routeName}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {route.area}, {route.city || 'Salem'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {localities.length > 0 ? (
                                localities.slice(0, 3).map((loc, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                                  >
                                    {loc}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Not specified</span>
                              )}
                              {localities.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px]">
                                  +{localities.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {route.assignedAgentName ? (
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">
                                  {route.assignedAgentName.charAt(0)}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">
                                    {route.assignedAgentName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    AGT-{String(route.assignedAgentId).padStart(3, '0')}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="w-3 h-3" />
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleViewCustomers(route)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition"
                              title="View customers on route"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{route.customerCount || 0} Subscribers</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                route.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {route.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(route)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                                title="Edit route"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRoute(route)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                                title="Delete route"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Daily Handovers Verification Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                End-of-Day Agent Cash Handover Reconciliation
              </h2>
              <p className="text-xs text-slate-500">
                Verify physical cash submitted by field agents against recorded collection receipts.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              Total Handovers: {handovers.length}
            </span>
          </div>

          {handovers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-600">No daily cash handovers recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Field agents can submit their cash handover from their Daily Collection Sheet at the end of the day.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Handover ID</th>
                    <th className="py-3 px-4">Date & Agent</th>
                    <th className="py-3 px-4 text-right">System Cash</th>
                    <th className="py-3 px-4 text-right">Online Coll.</th>
                    <th className="py-3 px-4 text-right">Physical Declared</th>
                    <th className="py-3 px-4 text-right">Discrepancy</th>
                    <th className="py-3 px-4 text-right">5% Comm.</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {handovers.map((h) => {
                    const isDiscrepant = Math.abs(h.discrepancy) > 0;
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-800">
                          {h.handoverId}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{h.agentName || 'Agent'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{h.handoverDate}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          ₹{h.totalCash.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{h.totalOnline.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          ₹{h.declaredCash.toLocaleString('en-IN')}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            isDiscrepant ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {h.discrepancy > 0 ? `+₹${h.discrepancy}` : h.discrepancy < 0 ? `-₹${Math.abs(h.discrepancy)}` : '₹0'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-amber-700">
                          ₹{h.commissionAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              h.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : h.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {h.status === 'submitted' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleVerifyHandover(h, 'verified')}
                                disabled={handoverActionLoading}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition"
                              >
                                Accept & Verify
                              </button>
                              <button
                                onClick={() => handleVerifyHandover(h, 'rejected')}
                                disabled={handoverActionLoading}
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Verified by {h.verifiedByName || 'Cashier'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT ROUTE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <MapPin className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRoute ? 'Edit Collection Route' : 'Add New Collection Route'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 mt-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Route Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fairlands & Meyyanur"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Primary Area / Locality *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fairlands"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Sub-localities / Streets (Comma Separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Brindavan Road, Meyyanur Main Road, New Bus Stand, State Bank Colony"
                  value={subLocalities}
                  onChange={(e) => setSubLocalities(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  List landmark streets or areas included in this agent's daily collection rounds.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Assigned Field Agent
                </label>
                <select
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">-- No Agent (Keep Unassigned) --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.fullName || ag.username} (AGT-{String(ag.id).padStart(3, '0')})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  All subscribers registered under this route will automatically be collected by this field agent.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Route Status</label>
                <select
                  value={routeStatus}
                  onChange={(e) => setRouteStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold"
                >
                  <option value="active">Active (Available for Assignment)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  {modalSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editingRoute ? 'Save Changes' : 'Create Route'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ROUTE CUSTOMERS MODAL */}
      {viewingRoute && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-800">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Subscribers on {viewingRoute.routeName} ({viewingRoute.routeId})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assigned Agent: <span className="font-bold text-slate-800">{viewingRoute.assignedAgentName || 'Unassigned'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingRoute(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingCustomers ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                  <span className="text-xs">Fetching subscribers...</span>
                </div>
              ) : routeCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600">No subscribers currently assigned to this route</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When registering new customers or editing existing ones in Customers View, assign them to "{viewingRoute.routeName}".
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Subscriber ID</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3">Street Address</th>
                        <th className="py-2.5 px-3">Chit Group</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routeCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                            {c.customerId}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{c.fullName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{c.mobileNumber}</td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                            {c.address}, {c.city}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {(c as any).newGroupNo || (c as any).groupId || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingRoute(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-UI Confirmation Modal for Deleting Route */}
      {deletingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Collection Route?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to delete route <strong className="text-slate-900 font-semibold">{deletingRoute.routeName}</strong> ({deletingRoute.routeId || deletingRoute.id})?
              </p>
              {deletingRoute.customerCount && deletingRoute.customerCount > 0 ? (
                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3.5 text-left leading-relaxed">
                  ⚠️ <strong>Notice:</strong> This route currently has <strong>{deletingRoute.customerCount}</strong> subscribers assigned. Deleting this route will mark these subscribers as <em>Unassigned</em>.
                </div>
              ) : null}

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
                    setDeletingRoute(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={confirmDeleteRoute}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Yes, Delete Route</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
