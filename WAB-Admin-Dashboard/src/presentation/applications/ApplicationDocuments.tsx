import { useTranslation } from 'react-i18next';
import {
  documentKind,
  needsMedicalLicense,
  type ApplicationDetails,
} from '@/domain/applications/applications';
import { DocumentViewer } from '../components/media/DocumentViewer';

function DocumentList(p: {
  urls: readonly string[];
  label: (n: number) => string;
  filename: string;
}) {
  return (
    <>
      {p.urls.map((url, i) => (
        <DocumentViewer
          key={url}
          url={url}
          kind={documentKind(url)}
          label={p.label(i + 1)}
          filename={`${p.filename}-${String(i + 1)}`}
        />
      ))}
    </>
  );
}

/**
 * The private documents of an application (signed links): the trade license, and for a CLINIC the medical license
 * the merchant must upload too (§5.19); a clinic without one is flagged before the admin approves.
 */
export function ApplicationDocuments({ application }: { application: ApplicationDetails }) {
  const { t } = useTranslation();
  const { name, documentUrls, medicalLicenseUrls } = application;
  const clinic = needsMedicalLicense(application);
  return (
    <>
      <h2 className="wab-settings__title">{t('applications.documents')}</h2>
      {documentUrls.length === 0 ? (
        <p>{t('applications.noDocuments')}</p>
      ) : (
        <DocumentList
          urls={documentUrls}
          label={(n) => t('applications.document', { n, name })}
          filename="license"
        />
      )}
      {clinic || medicalLicenseUrls.length > 0 ? (
        <h2 className="wab-settings__title">{t('applications.medicalLicense')}</h2>
      ) : null}
      {clinic && medicalLicenseUrls.length === 0 ? (
        <p className="wab-field__error" role="alert">
          {t('applications.noMedicalLicense')}
        </p>
      ) : (
        <DocumentList
          urls={medicalLicenseUrls}
          label={(n) => t('applications.medicalDocument', { n, name })}
          filename="medical-license"
        />
      )}
    </>
  );
}
