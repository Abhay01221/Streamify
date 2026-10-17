import { vi, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../src/pages/Register';
import Login from '../src/pages/Login';
import AdminProblemEditor from '../src/pages/AdminProblemEditor';
import { useAuthStore } from '../src/store/authStore';
import { api } from '../src/lib/api';
vi.mock('../src/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ user: null }); vi.mocked(api.get).mockResolvedValue({ data: { nextNumber: 1, tags: [], google: { enabled: false }, github: { enabled: false } } }); });
test('registration exposes native email, username and password validation', async () => {
  render(<MemoryRouter><Register /></MemoryRouter>);
  expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  expect(screen.getByLabelText('Username')).toHaveAttribute('minLength', '3');
  expect(screen.getByLabelText('Password')).toHaveAttribute('minLength', '8');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } });
  expect(screen.getByLabelText('Email')).toBeInvalid();
  await screen.findByText(/configured by the app owner/);
});
test('login shows server failures and restores submit control', async () => {
  useAuthStore.setState({ login: vi.fn().mockRejectedValue(new Error('Invalid credentials')) });
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign In' })).not.toBeDisabled());
  expect(useAuthStore.getState().login).toHaveBeenCalledWith('user@example.test', 'wrong-password', false);
});
test('admin authoring needs a reference solution before publishing', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { problems: [] } });
  render(<MemoryRouter><AdminProblemEditor /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Problem' } });
  fireEvent.change(screen.getByLabelText(/^Slug/), { target: { value: 'new-problem' } });
  fireEvent.change(screen.getByLabelText(/Problem statement and input/), { target: { value: 'A detailed statement for a new original problem' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and publish' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Add a Python reference solution');
  expect(api.post).not.toHaveBeenCalled();
});
