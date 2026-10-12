import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, Server } from 'lucide-react';

export const HealthStatusBadge: React.FC = () => {
  const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 10000, // Comprobación cada 10 segundos
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-slate-500 bg-slate-100 px-4 py-2 rounded-xl text-sm border border-slate-200">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Comprobando estado del backend y base de datos...</span>
      </div>
    );
  }

  if (isError) {
    const errorMsg = error instanceof Error ? error.message : 'No se pudo conectar';
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-900 shadow-sm max-w-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Backend API no disponible</h4>
              <p className="text-xs text-red-700 mt-0.5">
                {errorMsg}. Verifique que el servicio de NestJS esté ejecutándose en el puerto 3000.
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 hover:bg-red-100 rounded-lg text-red-700 transition-colors"
            title="Reintentar comprobación"
            aria-label="Reintentar"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  const isDbUp = data?.database.status === 'up';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-blue-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Diagnóstico de Infraestructura en Vivo
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-blue-700 transition-colors"
          title="Actualizar estado"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Backend API */}
        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          <div className="p-2 rounded-lg bg-green-100 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">NestJS Backend API</div>
            <div className="text-sm font-semibold text-slate-900 flex items-center space-x-1.5">
              <span>Operativo v{data?.version}</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* PostgreSQL */}
        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          <div
            className={`p-2 rounded-lg ${
              isDbUp ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isDbUp ? (
              <Database className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Base de Datos PostgreSQL</div>
            <div className="text-sm font-semibold text-slate-900 flex items-center space-x-1.5">
              <span>{isDbUp ? 'Conectado (Ready)' : 'Sin Conexión Activa'}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isDbUp ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
            </div>
          </div>
        </div>
      </div>

      {!isDbUp && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Diagnóstico PostgreSQL: </span>
            {data?.database.details}
            <div className="mt-1 text-amber-800">
              💡 Para inicializar la base de datos local, inicie Docker Desktop y ejecute:{' '}
              <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-amber-950 font-semibold">
                docker compose -f docker/docker-compose.dev.yml up -d
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
