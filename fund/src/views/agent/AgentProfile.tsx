import React from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Shield } from 'lucide-react';
import type { User } from '../../types';

interface AgentProfileProps {
  user: User;
}

export const AgentProfile: React.FC<AgentProfileProps> = ({ user }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl mx-auto">
      <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full bg-amber-500 mx-auto flex items-center justify-center text-slate-900 border-4 border-slate-900 shadow-xl mb-4">
            <span className="text-4xl font-bold">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">{user.fullName || user.username}</h2>
          <p className="text-amber-400 font-medium capitalize mt-1">{user.role} Profile</p>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</p>
              <p className="font-medium text-slate-800 mt-0.5">{user.username}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role & Access</p>
              <p className="font-medium text-slate-800 mt-0.5 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Please contact an administrator if you need to update your profile information or reset your password.
          </p>
        </div>
      </div>
    </div>
  );
};
