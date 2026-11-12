import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  UserX,
  Key,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { api } from '../../api/client';
import type { User, UserRole, Route } from '../../types';

interface UsersViewProps {
  userRole: UserRole;
  currentUserId?: string | number;
}

export const UsersView: React.FC<UsersViewProps> = ({ userRole, currentUserId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add / Edit User Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'agent'>('agent');
  const [assignedRouteId, setAssignedRouteId] = useState<string>('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, routeData] = await Promise.all([
        api.getUsers(),
        api.getRoutes().catch(() => [])
      ]);
      setUsers(userData);
      setRoutes(routeData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
    setEmail('');
    setRole('agent');
    setAssignedRouteId('');
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username || '');
    setPassword('');
    setFullName(user.fullName || '');
    setPhone((user as any).phone || (user as any).phoneNumber || '');
    setEmail(user.email || '');
    setRole(user.role || 'agent');
    setAssignedRouteId(user.assignedRouteId || (user as any).assigned_route_id || '');
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || (!editingUser && !password)) {
      setModalError('Please fill all required fields (Name, Username, Password)');
      return;
    }

    const finalEmail = email.trim() ? email.trim() : `${username.trim().replace(/[^a-zA-Z0-9_]/g, '')}@jayapriyachits.com`;

    setModalSubmitting(true);
    setModalError(null);
    try {
      const payload: any = {
        username: username.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        email: finalEmail,
        role,
        assignedRouteId: role === 'agent' ? (assignedRouteId || null) : null
      };

      if (editingUser) {
        if (password) {
          payload.password = password;
        }
        await api.updateUser((editingUser.id || editingUser.userId)!, payload);
      } else {
        payload.password = password;
        await api.createUser(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save user account');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const targetId = user.id || user.userId;
    if (targetId === currentUserId) {
      alert('You cannot deactivate your own account.');
      return;
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`Are you sure you want to set ${user.fullName} to ${newStatus}?`)) return;

    try {
      await api.updateUser(targetId!, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    const targetId = user.id || user.userId;
    if (targetId === currentUserId) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Are you sure you want to completely delete ${user.fullName} from database? This action cannot be undone.`)) return;

    try {
      if (typeof api.deleteUser === 'function') {
        await api.deleteUser(targetId!);
      } else {
        await (api as any).request(`/users/${targetId}`, { method: 'DELETE' });
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword) return;

    setResetSubmitting(true);
    setResetError(null);
    try {
      await api.updateUser((resettingUser.id || resettingUser.userId)!, { password: newPassword });
      setResettingUser(null);
      setNewPassword('');
      alert('Password updated successfully');
      loadData();
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  const totalPages = Math.ceil(users.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Staff & User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based access control, operator credentials, phone numbers, and active system permissions
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User Account</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Route</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-center">Status</th>
                {userRole === 'admin' && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading system user accounts...
                  </td>
                </tr>
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                currentUsers.map((u, index) => {
                  const uId = u.id || u.userId;
                  return (
                    <tr key={uId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{indexOfFirstItem + index + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {u.fullName}
                        {uId === currentUserId && (
                          <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{u.username}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        ••••••••
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {(u as any).phone || (u as any).phoneNumber || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-900'
                              : u.role === 'agent'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span className="capitalize">{u.role === 'agent' ? 'Field Agent' : u.role}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'agent' ? (
                          u.assignedRouteName || u.assignedRouteId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{u.assignedRouteName || u.assignedRouteId}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      {userRole === 'admin' && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded border border-slate-200"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setResettingUser(u);
                                setNewPassword('');
                                setResetError(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 rounded border border-slate-200"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            {uId !== currentUserId && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded border border-slate-200"
                                title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                              >
                                {u.status === 'active' ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            {uId !== currentUserId && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 bg-slate-50 rounded border border-slate-200"
                                title="Delete User Completely"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && users.length > 0 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, users.length)} of {users.length} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="px-3 py-1 font-medium bg-white border border-slate-300 rounded">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingUser ? 'Edit User Account' : 'Create New Staff / Admin Account'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">Operator Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ramesh_cashier"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...(!editingUser ? { required: true } : {})}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="agent">Field Agent</option>
                    <option value="staff">Staff / Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {role === 'agent' && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-1.5">
                  <label className="block text-amber-900 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                    <span>Assigned Collection Route</span>
                  </label>
                  <select
                    value={assignedRouteId}
                    onChange={(e) => setAssignedRouteId(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 font-medium"
                  >
                    <option value="">-- No Route Assigned (Unassigned) --</option>
                    {routes.map((rt) => {
                      const isOtherAgent = rt.assignedAgentId && rt.assignedAgentId !== (editingUser?.id || editingUser?.userId);
                      return (
                        <option key={rt.id} value={rt.routeId || rt.id}>
                          {rt.routeId || rt.code} - {rt.routeName || rt.name} {isOtherAgent ? `(Currently: ${rt.assignedAgentName || 'Other Agent'})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-amber-800/80">
                    Field agents only see customers and collect dues on their assigned route.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {modalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'Update Account' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm">Reset Password for {resettingUser.fullName}</h3>
              <button
                onClick={() => setResettingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {resetError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  {resetSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};