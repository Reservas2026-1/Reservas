import React from 'react'
import {
  MessageCircle,
  Mail,
  CheckCheck,
  Ticket,
  BarChart3,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PaymentChannelBar {
  channel: string
  amount: string
  percentage: number
  barClass: string
  dotClass: string
}

const PAYMENT_CHANNELS: PaymentChannelBar[] = [
  {
    channel: 'Nequi',
    amount: '$780k',
    percentage: 82,
    barClass: 'from-fuchsia-600 to-purple-500',
    dotClass: 'bg-fuchsia-500',
  },
  {
    channel: 'Wompi',
    amount: '$690k',
    percentage: 72,
    barClass: 'from-red-600 to-rose-500',
    dotClass: 'bg-red-500',
  },
  {
    channel: 'Efectivo',
    amount: '$380k',
    percentage: 44,
    barClass: 'from-emerald-600 to-teal-500',
    dotClass: 'bg-emerald-500',
  },
]

/**
 * Sección Bento Grid "Automatización que reduce ausencias".
 */
export const ReserlyImpactBento: React.FC = () => {
  return (
    <section className="py-10 md:py-16 bg-white dark:bg-[#070B14] transition-colors">
      {/* Sección Bento Grid: Automatización que reduce ausencias */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            Operación Inteligente
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Automatización que reduce ausencias
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Recordatorios automáticos, control preciso de créditos y pagos en
            tiempo real para mantener tus sesiones llenas sin esfuerzo manual.
          </p>
        </div>

        {/* Bento Grid de 3 tarjetas visuales sin imágenes externas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tarjeta 1: Notificación WhatsApp / Email */}
          <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full text-[11px] font-bold border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                >
                  -78% Inasistencias
                </Badge>
              </div>
              <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                Recordatorios WhatsApp y Email
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Aviso automático antes de cada clase con confirmación y pase QR incluido.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-3">
              {/* Burbuja simulada de WhatsApp */}
              <div className="rounded-2xl bg-white dark:bg-slate-950 border border-emerald-200/80 dark:border-emerald-900/60 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    WhatsApp • Reserly Bot
                  </span>
                  <span className="text-slate-400 font-medium">18:00</span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                  ¡Hola Sofía! Tu cupo en{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    Spinning 7:00 PM (Bici #07)
                  </span>{' '}
                  está listo. Presenta tu pase QR en recepción.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900">
                      Confirmar asistencia
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                      Reprogramar
                    </span>
                  </div>
                  <CheckCheck className="w-4 h-4 text-sky-500 shrink-0" />
                </div>
              </div>

              {/* Tira simulada de correo electrónico */}
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                    Pase QR enviado a sofia@correo.com
                  </span>
                </div>
                <Badge variant="success" className="rounded-full text-[10px] px-2 py-0.5 shrink-0">
                  Entregado
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Saldo de tiquetera / créditos con barra de progreso */}
          <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full text-[11px] font-bold border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                >
                  Control de Créditos
                </Badge>
              </div>
              <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                Tiqueteras y saldo vigente
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Descuento atómico al reservar y alertas antes de la fecha de corte.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-3">
              {/* Tarjeta visual simulada de tiquetera */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white border border-slate-700/80 shadow-lg space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      Plan Activo
                    </p>
                    <p className="text-sm font-bold text-white">
                      Tiquetera 12 Sesiones • Pilates
                    </p>
                  </div>
                  <Badge variant="success" className="rounded-full text-[10px] px-2.5 py-0.5">
                    Vigente
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">8</span>
                  <span className="text-xs text-slate-400 font-medium">
                    / 12 créditos disponibles
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div
                    role="progressbar"
                    aria-valuenow={67}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Créditos disponibles en tiquetera"
                    className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden"
                  >
                    <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-red-500 to-rose-400" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>4 sesiones usadas</span>
                    <span className="text-amber-300 font-semibold">
                      Vence en 18 días
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  -1 crédito descontado al confirmar
                </span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  Auto
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 3: Mini gráfico de barras de pagos en tiempo real */}
          <Card className="md:col-span-2 lg:col-span-1 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full text-[11px] font-bold border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
                >
                  <TrendingUp className="w-3 h-3" />
                  +18% hoy
                </Badge>
              </div>
              <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                Pagos en tiempo real
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Conciliación instantánea entre Nequi, Wompi y efectivo en caja.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-3">
              <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Recaudo del día
                    </p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      $1.850.000
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    En vivo
                  </span>
                </div>

                {/* Mini gráfico de barras verticales */}
                <div className="grid grid-cols-3 gap-4 items-end h-32 pt-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {PAYMENT_CHANNELS.map((item) => (
                    <div
                      key={item.channel}
                      className="flex flex-col items-center justify-end h-full gap-1.5"
                    >
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                        {item.amount}
                      </span>
                      <div className="w-full max-w-[46px] h-20 rounded-t-xl bg-slate-100 dark:bg-slate-900 flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t ${item.barClass} transition-all duration-500`}
                          style={{ height: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Leyenda de canales */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  {PAYMENT_CHANNELS.map((item) => (
                    <div
                      key={item.channel}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                      <span>{item.channel}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Arqueo de caja automático
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Cuadrado
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default ReserlyImpactBento
