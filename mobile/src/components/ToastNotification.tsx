import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

// --- Toast Types ---
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// --- Global Toast Store (simple event emitter) ---
type ToastListener = (toast: Toast) => void;
let _listener: ToastListener | null = null;

export const showToast = (type: ToastType, title: string, message?: string, duration: number = 3000) => {
  const toast: Toast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    message,
    duration,
  };
  _listener?.(toast);
};

// Convenience shortcuts
export const toastSuccess = (title: string, message?: string) => showToast('success', title, message);
export const toastError = (title: string, message?: string) => showToast('error', title, message);
export const toastWarning = (title: string, message?: string) => showToast('warning', title, message);
export const toastInfo = (title: string, message?: string) => showToast('info', title, message);

// --- Toast Container Component ---
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    _listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, toast.duration || 3000);
    };
    return () => { _listener = null; };
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        />
      ))}
    </View>
  );
};

// --- Individual Toast Item ---
const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const toastConfig = {
    success: { icon: '✅', bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' },
    error:   { icon: '❌', bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
    warning: { icon: '⚠️', bg: '#fffbeb', border: '#f59e0b', text: '#d97706' },
    info:    { icon: 'ℹ️', bg: '#eff6ff', border: '#2563eb', text: '#2563eb' },
  };

  const config = toastConfig[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, (toast.duration || 3000) - 300);

    return () => clearTimeout(timer);
  }, [toast.duration, translateY, opacity, onDismiss]);

  return (
    <Animated.View style={[styles.toast, { backgroundColor: config.bg, borderColor: config.border, transform: [{ translateY }], opacity }]}>
      <Text style={styles.toastIcon}>{config.icon}</Text>
      <View style={styles.toastContent}>
        <Text style={[styles.toastTitle, { color: config.text }]}>{toast.title}</Text>
        {toast.message && (
          <Text style={styles.toastMessage}>{toast.message}</Text>
        )}
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 54, left: 16, right: 16,
    zIndex: 99999, gap: 8,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  toastIcon: { fontSize: 20 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: 14, fontWeight: '700' },
  toastMessage: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
  dismissBtn: { padding: 4 },
  dismissText: { fontSize: 14, color: '#94a3b8', fontWeight: '700' },
});
