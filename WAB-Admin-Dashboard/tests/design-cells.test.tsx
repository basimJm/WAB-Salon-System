import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KpiCard } from '@/presentation/components/core/KpiCard';
import { PageHeader } from '@/presentation/components/core/PageHeader';
import { EntityCell, initialOf, RatingCell } from '@/presentation/components/data/TableCells';
import { renderWithApp } from './helpers/render';

describe('design table cells', () => {
  it.each([
    ['Noor Salon', 'N'],
    ['  laith', 'L'],
    ['ليث', 'ل'],
    ['', ''],
  ])('initialOf(%j) = %j', (name, initial) => {
    expect(initialOf(name)).toBe(initial);
  });

  it('EntityCell shows the initial, the name, a second line and a badge', () => {
    renderWithApp(<EntityCell name="Noor Salon" sub="+962790000301" badge={<em>new</em>} />);
    expect(screen.getByText('N')).toHaveClass('wab-entity__initial');
    expect(screen.getByText('Noor Salon')).toHaveClass('wab-entity__name');
    expect(screen.getByText('+962790000301')).toHaveClass('wab-entity__sub');
    expect(screen.getByText('new')).toBeInTheDocument();
  });

  it('RatingCell shows the average and count in the language digits', () => {
    const { unmount } = renderWithApp(<RatingCell avg={4.5} count={9} language="en" />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(9)')).toBeInTheDocument();
    unmount();
    renderWithApp(<RatingCell avg={4.5} count={9} language="ar" />, undefined, 'ar');
    expect(screen.getByText('(٩)')).toBeInTheDocument();
  });
});

describe('design header and KPI blocks', () => {
  it('PageHeader shows badges next to the title', () => {
    renderWithApp(<PageHeader title="Bookings" badges={<span>Live</span>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bookings' }).parentElement).toHaveClass(
      'wab-pageheader__titlerow',
    );
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('KpiCard lists its breakdown under the value, and none while loading', () => {
    const parts = [{ key: 'a', label: 'payment.succeeded', value: '60' }];
    const { unmount } = renderWithApp(
      <KpiCard label="Payments" value="64" deltaPercent={-3.2} parts={parts} />,
    );
    expect(screen.getByText('payment.succeeded').closest('li')).toHaveClass('wab-kpi__part');
    expect(screen.getByText('3.2%').closest('.wab-kpi__delta')).toHaveClass('wab-kpi__delta--down');
    unmount();
    renderWithApp(<KpiCard label="Payments" value="64" loading parts={parts} />);
    expect(screen.queryByText('payment.succeeded')).toBeNull();
  });
});
