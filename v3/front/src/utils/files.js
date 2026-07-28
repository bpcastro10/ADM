export const isWrittenResult = (r) => r?.source_type === 'written' || r?.source_type === 'document'

export const isZipFile = (file) => Boolean(file?.name?.toLowerCase().endsWith('.zip'))
