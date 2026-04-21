import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Reservation {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  book_copy: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  time_remaining_seconds: number;
}

const QUERY_KEY = ['reservations'] as const;

export const useReservations = () => {
  const queryClient = useQueryClient();

  const fetchReservations = async (): Promise<Reservation[]> => {
    const { data } = await api.get('/reservations/');
    return data;
  };

  const reserveBook = async (bookId: string): Promise<Reservation> => {
    const { data } = await api.post('/reservations/', { book_id: bookId });
    return data;
  };

  const checkoutFromReservation = async (reservationId: string) => {
    const { data } = await api.post(`/reservations/${reservationId}/checkout/`);
    return data;
  };

  const cancelReservation = async (reservationId: string) => {
    const { data } = await api.post(`/reservations/${reservationId}/cancel/`);
    return data;
  };

  const reservationsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchReservations,
    // Refetch every 30 seconds to keep countdowns in sync without hammering the server
    refetchInterval: 30_000,
  });

  const reserveMutation = useMutation({
    mutationFn: reserveBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // Also invalidate books so available_copies_count updates
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: checkoutFromReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  return {
    reservations: reservationsQuery.data ?? [],
    isLoading: reservationsQuery.isLoading,
    error: reservationsQuery.error,
    reserveBook: reserveMutation.mutateAsync,
    isReserving: reserveMutation.isPending,
    checkoutFromReservation: checkoutMutation.mutateAsync,
    isCheckingOut: checkoutMutation.isPending,
    cancelReservation: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
};
