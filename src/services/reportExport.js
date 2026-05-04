import { NativeModules, PermissionsAndroid, Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';

const { ReportShareModule } = NativeModules;
const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const CURRENCY_KEYS = ['amount', 'feed_cost', 'price_per_bird', 'total_revenue', 'total_expenses'];
const DECIMAL_KEYS = ['feed_quantity', 'feed_used'];
const STATUS_KEYS = ['batch_status', 'status'];
const ZERO_DEFAULT_KEYS = ['birds_alive', 'birds_sold', 'total_mortality', 'number_dead'];

// Formats numeric values for spreadsheet cells.
const formatNumber = (value, digits = 2) => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return 'N/A';
  }

  return numericValue.toFixed(digits);
};

// Formats currency-like report values with two decimal places.
const formatCurrency = value => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return '0.00';
  }

  return numericValue.toFixed(2);
};

// Applies report-column-specific formatting before Excel export.
const formatCellValue = (columnKey, value) => {
  if (ZERO_DEFAULT_KEYS.includes(columnKey)) {
    const numericValue = Number(value || 0);
    return Number.isFinite(numericValue) ? String(numericValue) : '0';
  }

  if (CURRENCY_KEYS.includes(columnKey)) {
    return formatCurrency(value);
  }

  if (DECIMAL_KEYS.includes(columnKey)) {
    return formatNumber(value);
  }

  if (STATUS_KEYS.includes(columnKey)) {
    return String(value || 'N/A');
  }

  return String(value ?? 'N/A');
};

// Produces a filesystem-safe report name.
const sanitizeName = value =>
  String(value || 'report')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// Pads date and time file-name parts to two digits.
const padFilePart = value => String(value).padStart(2, '0');

// Builds a timestamp that is safe to use in exported file names.
const formatFileDateTime = date => {
  const year = date.getFullYear();
  const month = padFilePart(date.getMonth() + 1);
  const day = padFilePart(date.getDate());
  const hours = padFilePart(date.getHours());
  const minutes = padFilePart(date.getMinutes());
  const seconds = padFilePart(date.getSeconds());

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
};

// Asks Android's media scanner to make the exported report visible to other apps.
const scanAndroidFile = async path => {
  if (Platform.OS !== 'android' || !path) {
    return;
  }

  try {
    await RNFS.scanFile(path);
  } catch (error) {
    console.log('Report scan skipped', error);
  }
};

// Shares the exported Excel file using the native Android bridge or iOS share sheet.
const shareReportFile = async ({ path, title }) => {
  if (!path) {
    return;
  }

  if (Platform.OS === 'android') {
    if (!ReportShareModule?.shareFile) {
      throw new Error('Android file share module is unavailable. Rebuild the app to load native changes.');
    }

    await ReportShareModule.shareFile(path, title, EXCEL_MIME_TYPE);
    return;
  }

  await Share.share({
    title,
    url: `file://${path}`,
    message: `Excel report saved to ${path}`,
  });
};

// Requests legacy Android storage permission only on versions that require it.
const ensureAndroidWritePermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version >= 29) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

// Converts summary card values into rows for the first workbook sheet.
const buildSummarySheetRows = summary =>
  summary.map(item => ({
    Metric: item.label,
    Value: item.value,
  }));

// Converts visible report columns and data into rows for the data workbook sheet.
const buildDataSheetRows = (columns, data) =>
  data.map(item => {
    const nextRow = {};

    columns.forEach(column => {
      nextRow[column.title] = formatCellValue(column.key, item[column.key]);
    });

    return nextRow;
  });

// Creates an Excel workbook, saves it to device storage, and attempts to share it.
export const exportReportToExcel = async ({ reportType, report }) => {
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(buildSummarySheetRows(report.summary));
  const dataSheet = XLSX.utils.json_to_sheet(buildDataSheetRows(report.columns, report.data));
  const exportDate = new Date();
  const reportLabel = sanitizeName(report.title || reportType);
  const fileName = `BroilerHub-${reportLabel}-${formatFileDateTime(exportDate)}.xlsx`;

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Report Data');

  const workbookBase64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const canWritePublicDownload = await ensureAndroidWritePermission();
  const preferredDirectory = Platform.OS === 'android' && canWritePublicDownload && RNFS.DownloadDirectoryPath
    ? `${RNFS.DownloadDirectoryPath}/BroilerHubReports`
    : Platform.OS === 'android' && RNFS.ExternalDirectoryPath
      ? `${RNFS.ExternalDirectoryPath}/BroilerHubReports`
      : `${RNFS.DocumentDirectoryPath}/BroilerHubReports`;
  const filePath = `${preferredDirectory}/${fileName}`;

  await RNFS.mkdir(preferredDirectory);

  try {
    await RNFS.writeFile(filePath, workbookBase64, 'base64');
    await scanAndroidFile(filePath);
  } catch (error) {
    if (Platform.OS !== 'android' || !RNFS.ExternalDirectoryPath) {
      throw error;
    }

    const fallbackDirectory = `${RNFS.ExternalDirectoryPath}/BroilerHubReports`;
    const fallbackPath = `${fallbackDirectory}/${fileName}`;

    await RNFS.mkdir(fallbackDirectory);
    await RNFS.writeFile(fallbackPath, workbookBase64, 'base64');
    await scanAndroidFile(fallbackPath);

    try {
      await shareReportFile({
        path: fallbackPath,
        title: `${report.title} Export`,
      });
    } catch (shareError) {
      console.log('Report share skipped', shareError);
    }

    return fallbackPath;
  }

  try {
    await shareReportFile({
      path: filePath,
      title: `${report.title} Export`,
    });
  } catch (error) {
    console.log('Report share skipped', error);
  }

  return filePath;
};
