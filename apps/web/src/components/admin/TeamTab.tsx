import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Mail,
  Shield,
  Copy,
  Check,
  RefreshCw,
  X,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { adminOperationsApi } from '../../api/admin-operations.api.js';

interface Props {
  businessId: string;
}

export const TeamTab: React.FC<Props> = ({ businessId }) => {
  const queryClient = useQueryClient();

  // Modal invitar
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [createdInvitation, setCreatedInvitation] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Consultar invitaciones del negocio
  const { data: invitations = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ['adminInvitations', businessId],
    queryFn: () => adminOperationsApi.getInvitations(businessId),
  });

  // Mutación: Enviar invitación
  const inviteMutation = useMutation({
    mutationFn: () =>
      adminOperationsApi.sendInvitation({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        businessId,
      }),
    onSuccess: (res) => {
      setCreatedInvitation(res);
      queryClient.invalidateQueries({ queryKey: ['adminInvitations'] });
    },
  });

  // Mutación: Revocar invitación
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      adminOperationsApi.revokeInvitation(businessId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminInvitations'] });
    },
  });

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/invitation?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Invite CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-base font-bold text-white mb-0.5">
            Gestión del Equipo e Invitaciones
          </h3>
          <p className="text-xs text-slate-400">
            Invitá colaboradores, recepcionistas y profesionales asignando roles con permisos RBAC.
          </p>
        </div>
        <button
          onClick={() => {
            setIsInviteModalOpen(true);
            setCreatedInvitation(null);
            setInviteEmail('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Invitar Miembro
        </button>
      </div>

      {/* Invitations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Invitaciones Enviadas ({invitations.length})
          </span>
        </div>

        {isLoadingInvites ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            Cargando invitaciones...
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No hay invitaciones pendientes. Hacé clic en "Invitar Miembro" para sumar staff.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold text-xs border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300 text-xs">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {inv.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Shield className="w-3 h-3" /> {inv.invitationType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {inv.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                      {inv.status === 'ACCEPTED' && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle className="w-3 h-3" /> Aceptada
                        </span>
                      )}
                      {inv.status === 'REVOKED' && (
                        <span className="text-slate-500">Revocada</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(inv.expiresAt).toLocaleDateString('es-AR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.status === 'PENDING' && (
                        <button
                          onClick={() => revokeMutation.mutate(inv.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 font-medium transition-colors"
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Invitar Miembro */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" /> Invitar a un Colaborador
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdInvitation ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <span className="font-bold block mb-1">¡Invitación generada con éxito!</span>
                  Se ha generado un token seguro para <strong className="text-white">{createdInvitation.email}</strong>.
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Enlace de Activación
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/invitation?token=${createdInvitation.token}`}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 flex-1 truncate font-mono"
                    />
                    <button
                      onClick={() => handleCopy(createdInvitation.token)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate();
                }}
                className="space-y-4 text-sm"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colaborador@voko.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Rol en el Negocio
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STAFF">Staff (Gestión de agenda y turnos)</option>
                    <option value="ADMIN">Administrador (Configuración completa)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {inviteMutation.isPending && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Generar Invitación
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
