import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Phone,
  Mail,
  CheckCircle,
  X,
  FileText,
  Save,
  RefreshCw,
} from 'lucide-react';
import { adminOperationsApi } from '../../api/admin-operations.api.js';

interface Props {
  businessId: string;
}

export const CustomersTab: React.FC<Props> = ({ businessId }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Listar clientes del negocio
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['adminCustomers', businessId, searchTerm],
    queryFn: () => adminOperationsApi.getCustomers(businessId, searchTerm),
  });

  // Consultar ficha de cliente seleccionado
  const { data: customerDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['adminCustomerDetail', businessId, selectedCustomerId],
    queryFn: () => adminOperationsApi.getCustomerDetail(businessId, selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  React.useEffect(() => {
    if (customerDetail) {
      setNotesInput(customerDetail.notes || '');
    }
  }, [customerDetail]);

  // Mutación: Guardar notas
  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) =>
      adminOperationsApi.updateCustomerNotes(businessId, selectedCustomerId!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['adminCustomerDetail'] });
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 3000);
    },
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total Clientes Registrados:{' '}
          <span className="font-bold text-white ml-1">{customers.length}</span>
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 text-slate-400 gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          Cargando cartera de clientes...
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-semibold text-white mb-1">
            No se encontraron clientes
          </h3>
          <p className="text-sm">
            Los clientes que agenden citas en tu local aparecerán automáticamente en esta lista.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold text-xs border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4 text-center">Turnos Totales</th>
                  <th className="py-3.5 px-4 text-center">Asistidos</th>
                  <th className="py-3.5 px-4 text-center">No-Show</th>
                  <th className="py-3.5 px-4">Última Visita</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{c.fullName}</div>
                      {c.notes && (
                        <span className="text-[11px] text-amber-400/90 italic truncate max-w-xs block">
                          Nota: {c.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-slate-300 font-mono">{c.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">
                      {c.totalAppointments}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                        {c.completedAppointments}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.noShowCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400">
                          {c.noShowCount}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {c.lastAppointmentDate
                        ? new Date(c.lastAppointmentDate).toLocaleDateString('es-AR')
                        : 'Nunca'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 transition-colors"
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                Cargando historial del cliente...
              </div>
            ) : customerDetail ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 font-bold text-xl flex items-center justify-center border border-indigo-500/20">
                      {customerDetail.firstName?.[0] || 'C'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {customerDetail.fullName}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-500" /> {customerDetail.email}
                        </span>
                        {customerDetail.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-500" /> {customerDetail.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomerId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* KPI Chips */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block">Total</span>
                    <span className="text-base font-bold text-white">
                      {customerDetail.statistics.totalAppointments}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block">Asistidos</span>
                    <span className="text-base font-bold text-emerald-400">
                      {customerDetail.statistics.completedAppointments}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block">No-Shows</span>
                    <span className="text-base font-bold text-purple-400">
                      {customerDetail.statistics.noShowCount}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block">Puntualidad</span>
                    <span className="text-base font-bold text-indigo-400">
                      {customerDetail.statistics.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Internal Notes Box */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" /> Notas Internas Confidenciales
                    </span>
                    {notesSavedSuccess && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Guardado
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Escribir preferencias, antecedentes médicos, requerimientos o notas del staff..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mb-2"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => updateNotesMutation.mutate(notesInput)}
                      disabled={updateNotesMutation.isPending}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {updateNotesMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Guardar Notas
                    </button>
                  </div>
                </div>

                {/* Appointment History List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Historial de Reservas en este Local
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {customerDetail.appointments?.map((app: any) => (
                      <div
                        key={app.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-white block">
                            {app.service?.name}
                          </span>
                          <span className="text-slate-400">
                            {new Date(app.startTime).toLocaleString('es-AR')} • {app.resource?.name || 'Staff'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-slate-300 font-semibold block">
                            ${app.snapshotPrice || 0}
                          </span>
                          <span className="text-[11px] text-slate-400 uppercase">{app.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
