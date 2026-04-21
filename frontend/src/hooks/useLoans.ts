import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Loan {
  id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  book_copy: string;
  created_at: string;
  due_date: string;
  returned_at: string | null;
  status: 'active' | 'overdue' | 'returned' | 'transferred' | 'pending_transfer';
  time_remaining_seconds: number;
}

const QUERY_KEY = ['loans'] as const;

export const useLoans = () => {
  const queryClient = useQueryClient();

  const fetchLoans = async (): Promise<Loan[]> => {
    const { data } = await api.get('/loans/');
    return data;
  };

  const checkoutBook = async (bookId: string): Promise<Loan> => {
    const { data } = await api.post('/loans/', { book_id: bookId });
    return data;
  };

  const returnBook = async (loanId: string): Promise<Loan> => {
    const { data } = await api.post(`/loans/${loanId}/return_book/`);
    return data;
  };

  const loansQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLoans,
    refetchInterval: 30_000,
  });

  const checkoutMutation = useMutation({
    mutationFn: checkoutBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const returnMutation = useMutation({
    mutationFn: returnBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  return {
    loans: loansQuery.data ?? [],
    isLoading: loansQuery.isLoading,
    error: loansQuery.error,
    checkoutBook: checkoutMutation.mutateAsync,
    isCheckingOut: checkoutMutation.isPending,
    returnBook: returnMutation.mutateAsync,
    isReturning: returnMutation.isPending,
  };
};
