import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentViewer } from '@/presentation/components/media/DocumentViewer';
import { ImageUploader, type UploadedImage } from '@/presentation/components/media/ImageUploader';
import {
  LocalizedImageUploader,
  type LocalizedImages,
} from '@/presentation/components/media/LocalizedImageUploader';
import { PhonePreview } from '@/presentation/components/media/PhonePreview';
import { MediaSection } from '@/presentation/pages/design/MediaSection';
import { axeViolations } from './helpers/axe';
import { renderWithApp } from './helpers/render';

const png = (name = 'a.png', size = 100) =>
  new File([new Uint8Array(size).fill(1)], name, { type: 'image/png' });
const done: UploadedImage = { key: 'k/a.png', url: 'https://cdn.example.com/a.png' };

function Harness({
  upload,
}: {
  upload: (f: File, p: (r: number) => void) => Promise<UploadedImage>;
}) {
  const [value, setValue] = useState<UploadedImage | null>(null);
  return (
    <>
      <ImageUploader
        label="Banner"
        value={value}
        onChange={setValue}
        upload={upload}
        maxBytes={1000}
      />
      <output>{value?.key ?? 'none'}</output>
    </>
  );
}
const fileInput = () => screen.getByLabelText('Banner', { selector: 'input' });

describe('ImageUploader', () => {
  it('uploads a valid file, shows the preview and the Replace/Remove actions', async () => {
    const upload = vi.fn(() => Promise.resolve(done));
    renderWithApp(<Harness upload={upload} />);
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeVisible();
    await userEvent.upload(fileInput(), png());
    expect(await screen.findByText('k/a.png')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img', { name: 'Banner' })).toHaveAttribute('src', done.url);
    expect(screen.getByRole('button', { name: 'Replace' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it.each([
    [
      'wrong type',
      new File(['x'], 'a.gif', { type: 'image/gif' }),
      /type is not allowed.*JPEG, PNG, WEBP/,
    ],
    ['too big', png('big.png', 2000), /too large.*1 KB/],
    ['empty', new File([], 'e.png', { type: 'image/png' }), /empty/],
  ])('rejects a %s file without uploading', async (_name, file, message) => {
    const upload = vi.fn(() => Promise.resolve(done));
    renderWithApp(<Harness upload={upload} />);
    fireEvent.change(fileInput(), { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(upload).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Retry upload' })).toBeNull();
  });

  it('shows progress while uploading and blocks a second pick', async () => {
    let report: (r: number) => void = () => undefined;
    let finish: (v: UploadedImage) => void = () => undefined;
    const upload = vi.fn((_f: File, onProgress: (r: number) => void) => {
      report = onProgress;
      return new Promise<UploadedImage>((resolve) => {
        finish = resolve;
      });
    });
    renderWithApp(<Harness upload={upload} />);
    await userEvent.upload(fileInput(), png());
    act(() => report(0.4));
    expect(await screen.findByRole('progressbar', { name: 'Uploading' })).toHaveAttribute(
      'value',
      '0.4',
    );
    expect(screen.getByText('40%')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Choose image' })).toBeDisabled();
    expect(fileInput()).toBeDisabled();
    await act(() => Promise.resolve(finish(done)));
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
  });

  it('keeps the file after a failure and retries it', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(done);
    renderWithApp(<Harness upload={upload} />);
    await userEvent.upload(fileInput(), png());
    expect(await screen.findByRole('alert')).toHaveTextContent('The upload failed');
    await userEvent.click(screen.getByRole('button', { name: 'Retry upload' }));
    expect(await screen.findByText('k/a.png')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepts a dropped file and ignores a drop while disabled', async () => {
    const upload = vi.fn(() => Promise.resolve(done));
    const { unmount } = renderWithApp(<Harness upload={upload} />);
    const zone = fileInput().closest('.wab-uploader__zone') as HTMLElement;
    fireEvent.dragOver(zone);
    expect(zone).toHaveClass('wab-uploader__zone--drag');
    fireEvent.drop(zone, { dataTransfer: { files: [png()] } });
    await screen.findByText('k/a.png');
    unmount();
    renderWithApp(
      <ImageUploader
        label="Banner"
        value={null}
        onChange={() => undefined}
        upload={upload}
        disabled
      />,
    );
    fireEvent.drop(fileInput().closest('.wab-uploader__zone') as HTMLElement, {
      dataTransfer: { files: [png()] },
    });
    expect(upload).toHaveBeenCalledTimes(1);
  });
});

describe('LocalizedImageUploader', () => {
  it('has an Arabic and an English uploader that change independently', async () => {
    function Pair() {
      const [value, setValue] = useState<LocalizedImages>({ ar: null, en: null });
      return (
        <>
          <LocalizedImageUploader
            label="Banner"
            value={value}
            onChange={setValue}
            upload={() => Promise.resolve(done)}
          />
          <output>{`${value.ar?.key ?? '-'}|${value.en?.key ?? '-'}`}</output>
        </>
      );
    }
    renderWithApp(<Pair />);
    expect(screen.getByRole('group', { name: 'Banner' })).toBeVisible();
    await userEvent.upload(screen.getByLabelText('Banner · English', { selector: 'input' }), png());
    expect(await screen.findByText('-|k/a.png')).toBeInTheDocument();
    expect(screen.getByLabelText('Banner · Arabic', { selector: 'input' })).toBeEnabled();
  });
});

describe('DocumentViewer', () => {
  const url = 'https://files.example.com/license.png?sig=abc';

  it('zooms in and out within limits, rotates both ways, and offers a download', async () => {
    renderWithApp(<DocumentViewer url={url} kind="image" label="License" filename="license.png" />);
    const image = screen.getByRole('img', { name: 'License' });
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(image.style.transform).toBe('rotate(0deg) scale(1.25)');
    expect(screen.getByText('125%')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Rotate right' }));
    expect(image.style.transform).toContain('rotate(90deg)');
    await userEvent.click(screen.getByRole('button', { name: 'Rotate left' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rotate left' }));
    expect(image.style.transform).toContain('rotate(270deg)');
    for (let i = 0; i < 10; i += 1)
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByText('50%')).toBeVisible();
    const download = screen.getByRole('link', { name: 'Download' });
    expect(download).toHaveAttribute('href', url);
    expect(download).toHaveAttribute('download', 'license.png');
    expect(download).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('a PDF has no zoom or rotate, only the document and a download link', () => {
    renderWithApp(<DocumentViewer url={url} kind="pdf" label="License" filename="l.pdf" />);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
    expect(document.querySelector('object[type="application/pdf"]')).toHaveAttribute('data', url);
    expect(screen.getByRole('link', { name: 'Download' })).toBeVisible();
  });

  it.each([
    'http://x.example.com/a.png',
    'javascript:alert(1)',
    'data:image/png;base64,AA',
    'nope',
  ])('refuses the unsafe address %s', (bad) => {
    renderWithApp(<DocumentViewer url={bad} kind="image" label="L" filename="f" />);
    expect(screen.getByRole('alert')).toHaveTextContent('not secure');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows zoom digits in Arabic', () => {
    renderWithApp(
      <DocumentViewer url={url} kind="image" label="L" filename="f" />,
      undefined,
      'ar',
    );
    expect(screen.getByText('١٠٠%')).toBeVisible();
  });
});

describe('PhonePreview', () => {
  it('sets the language and direction inside the frame only', () => {
    renderWithApp(
      <PhonePreview language="ar" label="Preview">
        <p>مرحبا</p>
      </PhonePreview>,
    );
    const screenEl = screen.getByText('مرحبا').parentElement as HTMLElement;
    expect(screenEl).toHaveAttribute('dir', 'rtl');
    expect(screenEl).toHaveAttribute('lang', 'ar');
    expect(screen.getByRole('group', { name: 'Preview' })).toBeVisible();
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });
});

describe('MediaSection (gallery)', () => {
  it('is accessible and uploads through the fake round trip', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    renderWithApp(
      <main>
        <MediaSection />
      </main>,
    );
    expect(await axeViolations()).toEqual([]);
    await userEvent.upload(
      screen.getByLabelText('Banner image · Arabic', { selector: 'input' }),
      png(),
    );
    expect(
      await screen.findByRole('img', { name: 'Arabic phone preview' }, { timeout: 3000 }),
    ).toHaveAttribute('src', 'blob:fake');
  });
});
