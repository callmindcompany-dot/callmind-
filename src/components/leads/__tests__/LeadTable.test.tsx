import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeadTable } from '../LeadTable';
// LeadTable takes the Lead shape exported by LeadsPage, which is a narrower
// type than the one in @/types/lead (its status is a literal union). Import the
// same one the component uses so the fixtures type-check against reality.
import type { Lead } from '../../LeadsPage';

/**
 * Regression test for the react-window v2 migration.
 *
 * react-window v2 renamed FixedSizeList to List and changed the props contract.
 * The component previously read `FixedSizeList` off the module, which is
 * undefined in v2, so React threw "Element type is invalid" as soon as there
 * was at least one lead to display — the main path of the leads screen. The
 * build only emitted a warning about the missing export, so nothing stopped it
 * shipping.
 *
 * These tests render with a non-empty list specifically, because the crash only
 * happened on the branch that mounts the virtualised list.
 */

const lead = (id: string, name: string): Lead =>
  ({
    id,
    name,
    phone: '+919000000000',
    email: `${id}@example.com`,
    status: 'New',
    companyId: 'c1',
    assignedTo: 'agent-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as unknown as Lead;

const baseProps = {
  activeLeadsLength: 2,
  selectedLeadIds: [] as string[],
  handleSelectLead: vi.fn(),
  handleSelectAll: vi.fn(),
  onSelectLead: vi.fn(),
  paginatedLoading: false,
  isPlaceholder: false,
  teamSettings: {},
  isAdmin: true,
  agents: [{ id: 'agent-1', name: 'Agent One' }],
  setShowAddModal: vi.fn(),
  setShowSmartImport: vi.fn(),
  onClearFilters: vi.fn(),
  currentPage: 1,
  totalPages: 1,
  totalCount: 2,
  onPageChange: vi.fn(),
  onLoadMore: vi.fn(),
};

describe('LeadTable virtualised list', () => {
  it('renders without throwing when leads are present', () => {
    // Before the fix this threw: Element type is invalid ... got: undefined.
    expect(() =>
      render(<LeadTable {...baseProps} displayedLeads={[lead('l1', 'Asha Patil')]} />)
    ).not.toThrow();
  });

  it('renders lead rows through the virtualised list', () => {
    render(
      <LeadTable
        {...baseProps}
        displayedLeads={[lead('l1', 'Asha Patil'), lead('l2', 'Rohit Mehta')]}
      />
    );

    // Proves the list actually mounted its rowComponent, not just that the
    // surrounding table chrome rendered.
    expect(screen.getByText('Asha Patil')).toBeInTheDocument();
  });

  // The component has two distinct empty states and picks between them on
  // activeLeadsLength, so both branches are worth pinning.
  it('shows the onboarding empty state when the pipeline has no leads at all', () => {
    render(<LeadTable {...baseProps} displayedLeads={[]} activeLeadsLength={0} totalCount={0} />);
    expect(screen.getByText(/Your Pipeline is Empty/i)).toBeInTheDocument();
  });

  it('shows the filtered empty state when filters exclude every lead', () => {
    render(<LeadTable {...baseProps} displayedLeads={[]} activeLeadsLength={5} totalCount={5} />);
    expect(screen.getByText(/No Leads Match Your Filters/i)).toBeInTheDocument();
  });
});
