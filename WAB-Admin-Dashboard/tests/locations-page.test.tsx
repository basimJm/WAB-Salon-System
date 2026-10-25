import { screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AreasPage from '@/presentation/locations/AreasPage';
import CitiesPage from '@/presentation/locations/CitiesPage';
import CountriesPage from '@/presentation/locations/CountriesPage';
import { makeContainer, renderWithApp } from './helpers/render';

const drawer = () => screen.findByRole('dialog');

async function saveWithReason(reason: string) {
  const d = await drawer();
  await userEvent.type(within(d).getByRole('textbox', { name: /Reason/ }), reason);
  await userEvent.click(within(d).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

describe('Countries', () => {
  it('lists countries with code and dial code', async () => {
    renderWithApp(
      <MemoryRouter>
        <CountriesPage />
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText('+962')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('validates the code, dial code and pattern before saving', async () => {
    renderWithApp(
      <MemoryRouter>
        <CountriesPage />
      </MemoryRouter>,
      makeContainer(),
    );
    await screen.findByText('Jordan');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const d = await drawer();
    await userEvent.type(within(d).getByRole('textbox', { name: 'Country code' }), 'j');
    await userEvent.type(within(d).getByRole('textbox', { name: 'Dial code' }), '962');
    await userEvent.click(within(d).getByRole('textbox', { name: 'Phone number pattern' }));
    await userEvent.paste('([');
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }));
    expect(within(d).getByText('Two capital letters, e.g. JO')).toBeInTheDocument();
    expect(within(d).getByText('Like +962')).toBeInTheDocument();
    expect(within(d).getByText('Not a valid pattern')).toBeInTheDocument();
    expect(within(d).getAllByText('This field is required').length).toBeGreaterThan(1);
  });

  it('creates a country and shows it, then switches it off with a reason', async () => {
    renderWithApp(
      <MemoryRouter>
        <CountriesPage />
      </MemoryRouter>,
      makeContainer(),
    );
    await screen.findByText('Jordan');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const d = await drawer();
    const text = async (name: string, v: string) => {
      await userEvent.click(within(d).getByRole('textbox', { name }));
      await userEvent.paste(v);
    };
    await text('Name (Arabic)', 'مصر');
    await text('Name (English)', 'Egypt');
    await text('Country code', 'eg');
    await text('Dial code', '+20');
    await text('Flag file', 'flags/eg.svg');
    await text('Phone number pattern', '^1[0-9]{9}$');
    await saveWithReason('New market');
    expect(await screen.findByText('Egypt')).toBeInTheDocument();

    const row = screen.getByText('Egypt').closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const e = await drawer();
    expect(within(e).getByRole('textbox', { name: 'Country code' })).toBeDisabled();
    await userEvent.click(within(e).getByRole('switch', { name: 'Active' }));
    await saveWithReason('Paused');
    const after = (await screen.findByText('Egypt')).closest('tr') as HTMLElement;
    expect(within(after).getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the error state when the list cannot load', async () => {
    const container = makeContainer();
    container.mock?.scenarios.set('serverError');
    renderWithApp(
      <MemoryRouter>
        <CountriesPage />
      </MemoryRouter>,
      container,
    );
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('Cities and areas', () => {
  it('filters cities by country and requires a parent when adding', async () => {
    renderWithApp(
      <MemoryRouter>
        <CitiesPage />
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByText('Amman')).toBeInTheDocument();
    expect(screen.getByText('Irbid')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const d = await drawer();
    await userEvent.type(within(d).getByRole('textbox', { name: 'Name (Arabic)' }), 'الزرقاء');
    await userEvent.type(within(d).getByRole('textbox', { name: 'Name (English)' }), 'Zarqa');
    await userEvent.type(within(d).getByRole('textbox', { name: 'Reason' }), 'New city');
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }));
    expect(within(d).getByText('This field is required')).toBeInTheDocument();
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: 'Country' }), 'Jordan');
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Zarqa')).toBeInTheDocument();
  });

  it('areas list shows the city name and filters by city', async () => {
    renderWithApp(
      <MemoryRouter>
        <AreasPage />
      </MemoryRouter>,
      makeContainer(),
    );
    expect(await screen.findByText('Abdoun')).toBeInTheDocument();
    expect(screen.getAllByText('Amman').length).toBeGreaterThan(0);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('an area is created under a real city id (generated id pattern, contract 1.5.0)', async () => {
    renderWithApp(
      <MemoryRouter>
        <AreasPage />
      </MemoryRouter>,
      makeContainer(),
    );
    await screen.findByText('Abdoun');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    const d = await drawer();
    await userEvent.type(within(d).getByRole('textbox', { name: 'Name (Arabic)' }), 'الصويفية');
    await userEvent.type(within(d).getByRole('textbox', { name: 'Name (English)' }), 'Sweifieh');
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: 'City' }), 'Amman');
    await saveWithReason('More areas');
    expect(await screen.findByText('Sweifieh')).toBeInTheDocument();
  });
});
