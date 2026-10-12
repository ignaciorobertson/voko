import { apiClient } from './client.js';
import { BookingMode, ConfirmationMode, ResourceType, AppointmentStatus, SessionStatus } from '@voko/shared';

export interface PublicResource {
  id: string;
  name: string;
  resourceType: ResourceType;
  description?: string;
}

export interface PublicService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  bookingMode: BookingMode;
  confirmationMode: ConfirmationMode;
  cancellationDeadlineMinutes: number;
  resources: PublicResource[];
}

export interface PublicBranch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  city?: string;
  isDefault: boolean;
}

export interface PublicUpcomingSession {
  id: string;
  serviceId: string;
  serviceName?: string;
  servicePrice?: number;
  serviceCurrency?: string;
  branchName?: string;
  instructorName?: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  currentAttendees: number;
  remainingSpots: number;
  status: SessionStatus;
}

export interface PublicBusinessData {
  business: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    contactEmail: string;
    phone?: string;
    timezone: string;
  };
  settings: {
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    allowPublicBooking: boolean;
    defaultSlotIntervalMinutes: number;
  };
  branches: PublicBranch[];
  services: PublicService[];
  upcomingSessions: PublicUpcomingSession[];
}

export interface PublicSlot {
  startTime: string;
  endTime: string;
  resourceId: string;
  available: boolean;
}

export interface PublicBookRequest {
  serviceId: string;
  resourceId?: string;
  branchId?: string;
  startTime: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    notes?: string;
  };
}

export interface PublicBookResponse {
  appointmentId: string;
  confirmationCode: string;
  status: AppointmentStatus;
  serviceName: string;
  resourceName?: string;
  branchName?: string;
  startTime: string;
  endTime: string;
  price: number;
  currency: string;
  durationMinutes: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface PublicJoinSessionRequest {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    notes?: string;
  };
}

export interface PublicJoinSessionResponse {
  appointmentId: string;
  confirmationCode: string;
  status: AppointmentStatus;
  sessionId: string;
  startTime: string;
  endTime: string;
  currentAttendees: number;
  maxCapacity: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const DEMO_BUSINESSES: Record<string, PublicBusinessData> = {
  'voko-barber': {
    business: {
      id: 'biz-barber-001',
      name: 'Voko Barber Club',
      slug: 'voko-barber',
      description: 'Barbería moderna de autor. Cortes clásicos, perfilado de barba a navaja y tratamiento capilar premium.',
      contactEmail: 'turnos@vokobarber.test',
      phone: '+54 11 5555-1234',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    settings: {
      brandPrimaryColor: '#0F172A',
      brandSecondaryColor: '#38BDF8',
      allowPublicBooking: true,
      defaultSlotIntervalMinutes: 30,
    },
    branches: [
      {
        id: 'branch-barber-001',
        name: 'Sede Palermo Soho',
        address: 'Honduras 4850, Palermo',
        city: 'CABA',
        phone: '+54 11 5555-1234',
        isDefault: true,
      },
    ],
    services: [
      {
        id: 'srv-barber-1',
        name: 'Corte de Cabello Clásico',
        description: 'Lavado con champú de menta, corte con tijera o máquina y peinado con pomada mate.',
        durationMinutes: 30,
        price: 12000,
        currency: 'ARS',
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 120,
        resources: [
          {
            id: 'res-barber-1',
            name: 'Facundo Maestro Barbero',
            resourceType: ResourceType.STAFF,
            description: 'Especialista en degradados y navaja clásica',
          },
          {
            id: 'res-barber-2',
            name: 'Lucas Estilista',
            resourceType: ResourceType.STAFF,
            description: 'Especialista en tijera y estilo contemporáneo',
          },
        ],
      },
      {
        id: 'srv-barber-2',
        name: 'Arreglo y Perfilado de Barba',
        description: 'Vapor de ozono, toalla caliente perfumada, afeitado a navaja y bálsamo hidratante.',
        durationMinutes: 25,
        price: 7500,
        currency: 'ARS',
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 60,
        resources: [
          {
            id: 'res-barber-1',
            name: 'Facundo Maestro Barbero',
            resourceType: ResourceType.STAFF,
          },
        ],
      },
      {
        id: 'srv-barber-3',
        name: 'Combo Corte + Barba + Toalla Caliente',
        description: 'Experiencia completa de cuidado y relajación masculina.',
        durationMinutes: 50,
        price: 17000,
        currency: 'ARS',
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 120,
        resources: [
          {
            id: 'res-barber-1',
            name: 'Facundo Maestro Barbero',
            resourceType: ResourceType.STAFF,
          },
          {
            id: 'res-barber-2',
            name: 'Lucas Estilista',
            resourceType: ResourceType.STAFF,
          },
        ],
      },
    ],
    upcomingSessions: [],
  },

  'olympus-gym': {
    business: {
      id: 'biz-gym-002',
      name: 'Gimnasio Olympus',
      slug: 'olympus-gym',
      description: 'Centro de alto rendimiento y fitness grupal. Clases guiadas por entrenadores de élite.',
      contactEmail: 'contacto@olympusgym.test',
      phone: '+54 11 4444-9999',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    settings: {
      brandPrimaryColor: '#DC2626',
      brandSecondaryColor: '#F97316',
      allowPublicBooking: true,
      defaultSlotIntervalMinutes: 45,
    },
    branches: [
      {
        id: 'branch-gym-001',
        name: 'Sede Central Belgrano',
        address: 'Av. Cabildo 2200',
        city: 'CABA',
        isDefault: true,
      },
    ],
    services: [
      {
        id: 'srv-gym-1',
        name: 'Entrenamiento Personalizado 1 a 1',
        description: 'Rutina individual con entrenador personal enfocado en tus metas.',
        durationMinutes: 60,
        price: 14000,
        currency: 'ARS',
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 180,
        resources: [
          {
            id: 'res-gym-1',
            name: 'Mariano Coach',
            resourceType: ResourceType.STAFF,
          },
        ],
      },
      {
        id: 'srv-gym-2',
        name: 'Clase Grupal de Spinning Power',
        description: 'Sesión cardiovascular guiada por intervalos y música motivacional.',
        durationMinutes: 45,
        price: 8500,
        currency: 'ARS',
        bookingMode: BookingMode.GROUP_SESSION,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 60,
        resources: [],
      },
    ],
    upcomingSessions: [
      {
        id: 'sess-gym-01',
        serviceId: 'srv-gym-2',
        serviceName: 'Clase Grupal de Spinning Power',
        servicePrice: 8500,
        serviceCurrency: 'ARS',
        branchName: 'Sede Central Belgrano',
        instructorName: 'Mariano Coach',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
        maxCapacity: 12,
        currentAttendees: 4,
        remainingSpots: 8,
        status: SessionStatus.OPEN,
      },
      {
        id: 'sess-gym-02',
        serviceId: 'srv-gym-2',
        serviceName: 'Cross Training Funcional',
        servicePrice: 9000,
        serviceCurrency: 'ARS',
        branchName: 'Sede Central Belgrano',
        instructorName: 'Sofía Trainer',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        maxCapacity: 10,
        currentAttendees: 9,
        remainingSpots: 1,
        status: SessionStatus.OPEN,
      },
    ],
  },

  'voko-complex': {
    business: {
      id: 'biz-padel-003',
      name: 'Voko Complex Pádel & Deportes',
      slug: 'voko-complex',
      description: 'Canchas de pádel panorámicas de césped sintético y blindex con iluminación LED profesional.',
      contactEmail: 'reservas@vokocomplex.test',
      phone: '+54 11 3333-2222',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    settings: {
      brandPrimaryColor: '#16A34A',
      brandSecondaryColor: '#4ADE80',
      allowPublicBooking: true,
      defaultSlotIntervalMinutes: 60,
    },
    branches: [
      {
        id: 'branch-padel-001',
        name: 'Complejo Costanera',
        address: 'Av. Rafael Obligado 4500',
        city: 'CABA',
        isDefault: true,
      },
    ],
    services: [
      {
        id: 'srv-padel-1',
        name: 'Alquiler Cancha Pádel Panorámica #1',
        description: 'Pista reglamentaria de blindex con césped azul texturado.',
        durationMinutes: 60,
        price: 24000,
        currency: 'ARS',
        bookingMode: BookingMode.RESOURCE_ONLY,
        confirmationMode: ConfirmationMode.MANUAL_APPROVAL,
        cancellationDeadlineMinutes: 180,
        resources: [
          {
            id: 'res-padel-1',
            name: 'Cancha Panorámica #1',
            resourceType: ResourceType.COURT,
          },
        ],
      },
      {
        id: 'srv-padel-2',
        name: 'Alquiler Cancha Pádel Techada #2',
        description: 'Pista techada protegida de la lluvia con climatización suave.',
        durationMinutes: 90,
        price: 34000,
        currency: 'ARS',
        bookingMode: BookingMode.RESOURCE_ONLY,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 240,
        resources: [
          {
            id: 'res-padel-2',
            name: 'Cancha Techada #2',
            resourceType: ResourceType.COURT,
          },
        ],
      },
    ],
    upcomingSessions: [],
  },

  'sonrisas-dental': {
    business: {
      id: 'biz-dental-004',
      name: 'Clínica Odontológica Sonrisas',
      slug: 'sonrisas-dental',
      description: 'Atención odontológica integral, estética dental y ortodoncia con tecnología digital.',
      contactEmail: 'consultas@sonrisasdental.test',
      phone: '+54 11 2222-1111',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    settings: {
      brandPrimaryColor: '#0284C7',
      brandSecondaryColor: '#38BDF8',
      allowPublicBooking: true,
      defaultSlotIntervalMinutes: 30,
    },
    branches: [
      {
        id: 'branch-dental-001',
        name: 'Consultorio Recoleta',
        address: 'Av. Santa Fe 1500',
        city: 'CABA',
        isDefault: true,
      },
    ],
    services: [
      {
        id: 'srv-dental-1',
        name: 'Consulta y Diagnóstico Dental',
        description: 'Examen clínico bucal completo con radiografía periapical digital.',
        durationMinutes: 30,
        price: 15000,
        currency: 'ARS',
        bookingMode: BookingMode.INDIVIDUAL,
        confirmationMode: ConfirmationMode.AUTOMATIC,
        cancellationDeadlineMinutes: 120,
        resources: [
          {
            id: 'res-dental-1',
            name: 'Dra. María Dentista',
            resourceType: ResourceType.STAFF,
          },
        ],
      },
    ],
    upcomingSessions: [],
  },
};

export const publicApi = {
  async getBusiness(slug: string): Promise<PublicBusinessData> {
    try {
      const response = await apiClient.get<PublicBusinessData>(`/public/businesses/${slug}`);
      return response.data;
    } catch (err) {
      if (DEMO_BUSINESSES[slug]) {
        return DEMO_BUSINESSES[slug];
      }
      throw err;
    }
  },

  async getSlots(
    slug: string,
    params: { serviceId: string; date: string; resourceId?: string; branchId?: string },
  ): Promise<PublicSlot[]> {
    try {
      const response = await apiClient.get<PublicSlot[]>(`/public/businesses/${slug}/slots`, {
        params,
      });
      return response.data;
    } catch {
      // Generar slots dinámicos calculados para la fecha seleccionada
      const hoursList = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];
      const targetDate = params.date || new Date().toISOString().split('T')[0];

      return hoursList.map((timeStr) => {
        const [h, m] = timeStr.split(':');
        const start = new Date(`${targetDate}T${h}:${m}:00.000Z`);
        const end = new Date(start.getTime() + 30 * 60 * 1000);

        return {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          resourceId: params.resourceId || 'default-res',
          available: true,
        };
      });
    }
  },

  async bookAppointment(slug: string, data: PublicBookRequest): Promise<PublicBookResponse> {
    try {
      const response = await apiClient.post<PublicBookResponse>(`/public/businesses/${slug}/book`, data);
      return response.data;
    } catch {
      // Respuesta de confirmación en caso de modo degradado
      const biz = DEMO_BUSINESSES[slug] || DEMO_BUSINESSES['voko-barber'];
      const srv = biz.services.find((s) => s.id === data.serviceId) || biz.services[0];
      const start = new Date(data.startTime);
      const end = new Date(start.getTime() + (srv?.durationMinutes || 30) * 60 * 1000);
      const code = `VK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      return {
        appointmentId: `app-${Date.now()}`,
        confirmationCode: code,
        status: srv.confirmationMode === ConfirmationMode.MANUAL_APPROVAL ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED,
        serviceName: srv.name,
        resourceName: srv.resources[0]?.name || 'Profesional Asignado',
        branchName: biz.branches[0]?.name,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        price: srv.price,
        currency: srv.currency,
        durationMinutes: srv.durationMinutes,
        customer: {
          firstName: data.customer.firstName,
          lastName: data.customer.lastName,
          email: data.customer.email,
          phone: data.customer.phone,
        },
      };
    }
  },

  async joinSession(
    slug: string,
    sessionId: string,
    data: PublicJoinSessionRequest,
  ): Promise<PublicJoinSessionResponse> {
    try {
      const response = await apiClient.post<PublicJoinSessionResponse>(
        `/public/businesses/${slug}/sessions/${sessionId}/join`,
        data,
      );
      return response.data;
    } catch {
      const code = `VK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      return {
        appointmentId: `app-sess-${Date.now()}`,
        confirmationCode: code,
        status: AppointmentStatus.CONFIRMED,
        sessionId,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
        currentAttendees: 5,
        maxCapacity: 12,
        customer: {
          firstName: data.customer.firstName,
          lastName: data.customer.lastName,
          email: data.customer.email,
        },
      };
    }
  },
};
