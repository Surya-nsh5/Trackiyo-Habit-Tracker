import React, { useEffect } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { FiBell, FiX, FiAlertCircle, FiCheckSquare, FiActivity, FiAward } from 'react-icons/fi';

export const NotificationCenter: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const { notifications, isOpen, setIsOpen, markAllAsRead, dismissNotification, refreshNotifications } = useNotificationStore();

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative min-w-0">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refreshNotifications();
        }}
        aria-label="Notifications"
        title="Notifications"
        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors relative"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed sm:absolute top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-3 right-3 sm:left-auto sm:right-0 sm:top-12 w-auto sm:w-96 max-w-sm sm:max-w-none bg-navbar border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-colors max-h-[calc(100dvh-5rem-env(safe-area-inset-top,0px))] min-w-0 z-50">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/70 bg-navbar/80 flex-shrink-0 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-bold tracking-[0.1em] uppercase text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-accent bg-accent/15 px-1.5 py-0.2 rounded">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-accent font-semibold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0 min-w-0">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">All caught up! Zero pending alerts.</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 rounded border text-xs flex items-start justify-between gap-2.5 min-w-0 transition-colors ${
                      n.read ? 'bg-elevated/30 border-border/40 opacity-75' : 'bg-elevated border-accent/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 text-accent shrink-0">
                        {n.type === 'task' && <FiAlertCircle size={15} className="text-warning" />}
                        {n.type === 'habit' && <FiCheckSquare size={15} className="text-accent" />}
                        {n.type === 'wellness' && <FiActivity size={15} className="text-info" />}
                        {n.type === 'milestone' && <FiAward size={15} className="text-success" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-foreground block break-words [overflow-wrap:anywhere] min-w-0">{n.title}</span>
                        <p className="text-muted text-[11px] mt-0.5 break-words [overflow-wrap:anywhere] min-w-0">{n.message}</p>
                        {n.linkTab && (
                          <button
                            onClick={() => {
                              onNavigateTab(n.linkTab!);
                              setIsOpen(false);
                            }}
                            className="mt-1 text-[10px] font-bold text-accent hover:underline uppercase"
                          >
                            Go to {n.linkTab} →
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="p-1 text-muted hover:text-foreground shrink-0"
                      title="Dismiss"
                    >
                      <FiX size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
};
