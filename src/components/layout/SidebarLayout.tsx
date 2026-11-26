import { useState, type ReactNode } from 'react'
import { Menu, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBranding } from '@/context/BrandingContext'
import type { Tables } from '@/types/database'

function capitalizeLabel(value: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export type SidebarNavSection = {
  title: string
  items: {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}

export type SidebarLayoutProps = {
  sections: SidebarNavSection[]
  activeTab: string
  onSelectTab: (tabId: string) => void
  currentUser: Tables<'perfiles'> | null
  onSignOut: () => void
  onLogoClick?: () => void
  headerActions?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export default function SidebarLayout({
  sections,
  activeTab,
  onSelectTab,
  currentUser,
  onSignOut,
  onLogoClick,
  headerActions,
  footer,
  children,
}: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const { studioName, currentPalette, logoUrl, estudioActivo, verticalConfig } = useBranding()
  const mapNavLabel = `Mapa de ${capitalizeLabel(verticalConfig.recursoCortoPlural)}`

  const getItemLabel = (item: SidebarNavSection['items'][number]): string => {
    if (item.id === 'cliente-mapa' || item.label === 'Mapa 15 Bicis') {
      return mapNavLabel
    }
    return item.label
  }

  const activeItem = sections.flatMap((s) => s.items).find((item) => item.id === activeTab)
  const activeItemLabel = activeItem ? getItemLabel(activeItem) : 'Panel de Control'

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
      {/* Overlay oscuro para móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar fijo lateral (drawer en móvil/tablet, colapsable en escritorio lg:) */}
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-200 ease-in-out ${
          desktopCollapsed ? 'w-64 lg:w-20' : 'w-64 lg:w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Cabecera del Sidebar */}
        <div className="h-14 px-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onLogoClick?.()
              setMobileOpen(false)
            }}
            className={`flex items-center gap-2.5 min-w-0 rounded-md p-1 hover:bg-muted/50 transition-colors text-left ${
              desktopCollapsed ? 'lg:justify-center lg:w-full' : ''
            }`}
            title={studioName}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={studioName}
                className="w-8 h-8 rounded-lg object-cover shrink-0 border"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${currentPalette.bgClass}`}
              >
                {studioName?.charAt(0) || 'R'}
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 min-w-0 ${
                desktopCollapsed ? 'lg:hidden' : ''
              }`}
            >
              <span className="font-bold text-sm truncate">{studioName}</span>
              {estudioActivo && (
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold px-1.5 py-0 h-4 shrink-0"
                  title={estudioActivo.tipo_negocio || verticalConfig.etiquetaNegocio}
                >
                  {verticalConfig.etiquetaNegocio}
                </Badge>
              )}
            </div>
          </button>

          {/* Botón cerrar en móvil */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 shrink-0"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú lateral"
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Botón colapsar/expandir en escritorio cuando está expandido */}
          {!desktopCollapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDesktopCollapsed(true)}
              title="Colapsar barra lateral"
              aria-label="Colapsar barra lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Botón expandir cuando está colapsado en escritorio */}
        {desktopCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-border">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setDesktopCollapsed(false)}
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Enlaces de navegación */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {sections.map((section, idx) => (
            <div key={idx}>
              <p
                className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 ${
                  desktopCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {section.title}
              </p>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const IconComponent = item.icon
                  const isActive = activeTab === item.id
                  const itemLabel = getItemLabel(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={itemLabel}
                      onClick={() => {
                        onSelectTab(item.id)
                        setMobileOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        desktopCollapsed ? 'lg:justify-center lg:px-2' : ''
                      } ${
                        isActive
                          ? `${currentPalette.bgClass} text-white shadow-sm`
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {IconComponent && <IconComponent className="w-4 h-4 shrink-0" />}
                      <span
                        className={`truncate ${
                          desktopCollapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {itemLabel}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer usuario */}
        <div className="p-3 border-t border-border shrink-0">
          {currentUser && (
            <div
              className={`flex items-center justify-between gap-2 ${
                desktopCollapsed ? 'lg:flex-col lg:justify-center' : ''
              }`}
            >
              <div
                className={`flex items-center gap-2 min-w-0 ${
                  desktopCollapsed ? 'lg:justify-center' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.nombre_completo?.charAt(0) || 'U'}
                </div>
                <div className={`min-w-0 ${desktopCollapsed ? 'lg:hidden' : ''}`}>
                  <p className="text-xs font-semibold truncate">
                    {currentUser.nombre_completo}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {currentUser.rol}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="h-8 w-8 shrink-0"
              >
                <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Área de contenido principal con margen izquierdo dinámico en escritorio (lg:) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <header className="h-14 border-b border-border bg-card/90 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Botón hamburguesa móvil */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 shrink-0"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Abrir menú lateral"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Botón colapsar/expandir en escritorio dentro del header */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDesktopCollapsed((prev) => !prev)}
              title={desktopCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              aria-label={desktopCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            >
              {desktopCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>

            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
              {activeItemLabel}
            </span>
            {estudioActivo && (
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-[10px] font-medium px-2 py-0 h-5 shrink-0"
              >
                {studioName} • {verticalConfig.etiquetaNegocio}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
        </header>

        <main className="flex-1 bg-background overflow-y-auto pt-4 px-6 pb-8">
          {children}
        </main>

        {footer}
      </div>
    </div>
  )
}
