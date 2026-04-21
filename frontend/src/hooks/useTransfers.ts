import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface TransferRequest {
  id: string;
  loan: string;
  from_user: string;
  from_user_email: string;
  to_user: string;
  book_title: string;
  book_author: string;
  time_remaining_seconds: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
}

const QUERY_KEY = ['transfers'] as const;

export const useTransfers = () => {
  const queryClient = useQueryClient();

  const fetchTransfers = async (): Promise<TransferRequest[]> => {
    const { data } = await api.get('/transfers/');
    return data;
  };

  const acceptTransfer = async (transferId: string): Promise<void> => {
    await api.post(`/transfers/${transferId}/accept/`);
  };

  const rejectTransfer = async (transferId: string): Promise<void> => {
    await api.post(`/transfers/${transferId}/reject/`);
  };

  const cancelTransfer = async (transferId: string): Promise<void> => {
    await api.post(`/transfers/${transferId}/cancel/`);
  };

  const transfersQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTransfers,
    refetchInterval: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: [...QUERY_KEY, 'history'],
    queryFn: async (): Promise<TransferRequest[]> => {
      const { data } = await api.get('/transfers/history/');
      return data;
    },
    refetchInterval: 60_000,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  return {
    transfers: transfersQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading: transfersQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    error: transfersQuery.error,
    acceptTransfer: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
    rejectTransfer: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
    cancelTransfer: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
};
