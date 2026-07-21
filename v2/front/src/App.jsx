import { useState, useEffect, useRef } from 'react'
import './App.css'

import { useTheme } from './hooks/useTheme'
import { useContentData } from './hooks/useContentData'
import { useEvaluationHistory } from './hooks/useEvaluationHistory'
import { useCodeEvaluation } from './hooks/useCodeEvaluation'
import { useResumeEvaluation } from './hooks/useResumeEvaluation'
import { useCombinedAnalysis } from './hooks/useCombinedAnalysis'
import { useAdminConfig } from './hooks/useAdminConfig'
import { useBulkEvaluation } from './hooks/useBulkEvaluation'

import AppHeader from './components/common/AppHeader'
import LoadingScreen from './components/common/LoadingScreen'
import ErrorScreen from './components/common/ErrorScreen'
import CandidateCard from './components/CandidateCard'
import CodeEvaluationTab from './components/CodeEvaluationTab'
import CvEvaluationTab from './components/CvEvaluationTab'
import CombinedAnalysisTab from './components/CombinedAnalysisTab'
import AdminTab from './components/admin/AdminTab'
import CodeResultPanel from './components/results/CodeResultPanel'
import CvResultPanel from './components/results/CvResultPanel'
import CombinedResultPanel from './components/results/CombinedResultPanel'

function App() {
  const { theme, toggleTheme } = useTheme()
  const {
    jobs,
    setJobs,
    technicalTests,
    setTechnicalTests,
    contentLoading,
    contentError,
    loadContent,
  } = useContentData()
  const { evaluationHistory, setEvaluationHistory } = useEvaluationHistory()

  const [candidateName, setCandidateName] = useState('')
  const [activeTab, setActiveTab] = useState('admin')
  const [fileInputKey, setFileInputKey] = useState(0)

  const clearCombinedRef = useRef(() => {})

  const codeEval = useCodeEvaluation({
    candidateName,
    onClearCombined: () => clearCombinedRef.current(),
  })

  const resumeEval = useResumeEvaluation({
    candidateName,
    onClearCombined: () => clearCombinedRef.current(),
  })

  const combined = useCombinedAnalysis({
    result: codeEval.result,
    resumeResult: resumeEval.resumeResult,
    candidateName,
    setEvaluationHistory,
    setError: codeEval.setError,
    loading: codeEval.loading,
    resumeLoading: resumeEval.resumeLoading,
  })

  clearCombinedRef.current = combined.reset

  const admin = useAdminConfig({ jobs, technicalTests, setJobs, setTechnicalTests })
  const bulk = useBulkEvaluation()

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const selectedJob = jobs.find((j) => j.id === resumeEval.selectedJobId)
  const selectedTest = technicalTests.find((t) => t.id === codeEval.selectedTechnicalTestId)

  const resetEvaluationForms = () => {
    setCandidateName('')
    codeEval.reset()
    resumeEval.reset()
    combined.reset()
    bulk.reset()
    setFileInputKey((k) => k + 1)
  }

  const handleClearHistory = () => {
    if (window.confirm('¿Vaciar el listado de candidatos evaluados en esta sesión?')) {
      setEvaluationHistory([])
    }
  }

  if (contentLoading) {
    return <LoadingScreen theme={theme} onToggleTheme={toggleTheme} />
  }

  if (contentError) {
    return (
      <ErrorScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetForms={resetEvaluationForms}
        contentError={contentError}
      />
    )
  }

  return (
    <div className="app">
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetForms={resetEvaluationForms}
      />

      <div className="layout">
        <div className="stack">
          <CandidateCard
            candidateName={candidateName}
            onCandidateNameChange={setCandidateName}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            evaluationHistoryCount={evaluationHistory.length}
          />

          {activeTab === 'code' && (
            <CodeEvaluationTab
              technicalTests={technicalTests}
              selectedTest={selectedTest}
              codeEvalSubTab={codeEval.codeEvalSubTab}
              onSubTabChange={codeEval.setCodeEvalSubTab}
              selectedTechnicalTestId={codeEval.selectedTechnicalTestId}
              onTechnicalTestChange={(id) => codeEval.handleTechnicalTestChange(id, technicalTests)}
              language={codeEval.language}
              onLanguageChange={codeEval.setLanguage}
              uploadedFile={codeEval.uploadedFile}
              onFileChange={codeEval.handleFileChange}
              onClearUploadedFile={codeEval.clearUploadedFile}
              zipUpload={codeEval.zipUpload}
              code={codeEval.code}
              onCodeChange={codeEval.setCode}
              documentFile={codeEval.documentFile}
              onDocumentFileChange={codeEval.handleDocumentFileChange}
              onClearDocumentFile={codeEval.clearDocumentFile}
              notebookFile={codeEval.notebookFile}
              onNotebookFileChange={codeEval.handleNotebookFileChange}
              onClearNotebookFile={codeEval.clearNotebookFile}
              fileInputKey={fileInputKey}
              error={codeEval.error}
              loading={codeEval.loading}
              onEvaluate={codeEval.evaluate}
              onEvaluateWritten={codeEval.evaluateWritten}
              onEvaluateNotebook={codeEval.evaluateNotebook}
              onDownloadPdf={codeEval.handleDownloadPdf}
              bulkTestZip={bulk.bulkTestZip}
              bulkTestId={bulk.bulkTestId}
              onBulkTestIdChange={bulk.setBulkTestId}
              onBulkTestZipChange={bulk.handleBulkTestZipChange}
              onClearBulkTestZip={bulk.clearBulkTestZip}
              bulkTestLoading={bulk.bulkTestLoading}
              bulkTestResults={bulk.bulkTestResults}
              bulkTestError={bulk.bulkTestError}
              onEvaluateBulkTest={bulk.evaluateBulkTest}
            />
          )}

          {activeTab === 'cv' && (
            <CvEvaluationTab
              jobs={jobs}
              selectedJob={selectedJob}
              selectedJobId={resumeEval.selectedJobId}
              onJobChange={resumeEval.setSelectedJobId}
              resumeFile={resumeEval.resumeFile}
              onResumeFileChange={resumeEval.handleResumeFileChange}
              fileInputKey={fileInputKey}
              resumeError={resumeEval.resumeError}
              resumeLoading={resumeEval.resumeLoading}
              resumeResult={resumeEval.resumeResult}
              onEvaluateResume={resumeEval.evaluateResume}
              onDownloadResumePdf={resumeEval.downloadResumePdf}
              bulkCvZip={bulk.bulkCvZip}
              bulkCvJobId={bulk.bulkCvJobId}
              onBulkCvJobChange={bulk.setBulkCvJobId}
              onBulkCvZipChange={bulk.handleBulkCvZipChange}
              onClearBulkCvZip={bulk.clearBulkCvZip}
              bulkCvLoading={bulk.bulkCvLoading}
              bulkCvResults={bulk.bulkCvResults}
              bulkCvError={bulk.bulkCvError}
              onEvaluateBulkCv={bulk.evaluateBulkCv}
            />
          )}

          {activeTab === 'combined' && (
            <CombinedAnalysisTab
              result={codeEval.result}
              resumeResult={resumeEval.resumeResult}
              combinedLoading={combined.combinedLoading}
              loading={codeEval.loading}
              resumeLoading={resumeEval.resumeLoading}
              evaluationHistory={evaluationHistory}
              onGenerateAnalysis={combined.generateCombinedAnalysis}
              onDownloadUnifiedPdf={combined.downloadUnifiedPdf}
              onClearHistory={handleClearHistory}
              bulkCvResults={bulk.bulkCvResults}
              bulkTestResults={bulk.bulkTestResults}
              bulkCombinedLoading={bulk.bulkCombinedLoading}
              bulkCombinedResults={bulk.bulkCombinedResults}
              bulkCombinedError={bulk.bulkCombinedError}
              onAnalyzeBulkCombined={bulk.analyzeBulkCombined}
            />
          )}

          {activeTab === 'admin' && (
            <AdminTab
              adminSubTab={admin.adminSubTab}
              onAdminSubTabChange={admin.setAdminSubTab}
              adminMessage={admin.adminMessage}
              onClearAdminMessage={() => admin.setAdminMessage(null)}
              testsPanelProps={{
                jobs,
                technicalTests,
                editTestSelectValue: admin.editTestSelectValue,
                onSelectTest: admin.selectTestForEdit,
                onStartNewTest: admin.startNewTest,
                isNewTest: admin.isNewTest,
                draftTest: admin.draftTest,
                onDraftTestChange: admin.setDraftTest,
                onDefaultLanguageChange: admin.handleDefaultLanguageChange,
                onUpdateScoreScale: admin.updateDraftScoreScale,
                onUpdateCriterion: admin.updateDraftCriterion,
                onAddCriterion: admin.addDraftCriterion,
                onRemoveCriterion: admin.removeDraftCriterion,
                onSave: admin.acceptSaveTest,
                onCancel: admin.cancelEditTest,
                adminSaving: admin.adminSaving,
                onScanFile: admin.scanTestFile,
                scanLoading: admin.scanLoading,
                scanError: admin.scanError,
                onClearScanError: () => admin.setScanError(null),
              }}
              jobsPanelProps={{
                jobs,
                editJobSelectValue: admin.editJobSelectValue,
                onSelectJob: admin.selectJobForEdit,
                onStartNewJob: admin.startNewJob,
                isNewJob: admin.isNewJob,
                draftJob: admin.draftJob,
                onDraftJobChange: admin.setDraftJob,
                onUpdateCharacteristic: admin.updateDraftCharacteristic,
                onAddCharacteristic: admin.addDraftCharacteristic,
                onRemoveCharacteristic: admin.removeDraftCharacteristic,
                onSave: admin.acceptSaveJob,
                onCancel: admin.cancelEditJob,
                adminSaving: admin.adminSaving,
              }}
              onScanJobFile={admin.scanJobFile}
              scanJobLoading={admin.scanJobLoading}
              scanJobError={admin.scanJobError}
              onClearScanJobError={() => admin.setScanJobError(null)}
            />
          )}

        </div>

        <div className="stack sticky">
          {codeEval.result?.message && (
            <div className="result-card">
              <p style={{ color: 'var(--success)' }}>{codeEval.result.message}</p>
            </div>
          )}

          {activeTab === 'code' && (
            <CodeResultPanel result={codeEval.result} />
          )}

          {activeTab === 'cv' && (
            <CvResultPanel
              resumeResult={resumeEval.resumeResult}
              hasCodeResult={Boolean(codeEval.result)}
              resumeLoading={resumeEval.resumeLoading}
              loading={codeEval.loading}
              onDownloadResumePdf={resumeEval.downloadResumePdf}
              onDownloadUnifiedPdf={combined.downloadUnifiedPdf}
            />
          )}

          {activeTab === 'combined' && (
            <CombinedResultPanel
              result={codeEval.result}
              resumeResult={resumeEval.resumeResult}
              combinedResult={combined.combinedResult}
              combinedLoading={combined.combinedLoading}
              loading={codeEval.loading}
              resumeLoading={resumeEval.resumeLoading}
              onDownloadUnifiedPdf={combined.downloadUnifiedPdf}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
