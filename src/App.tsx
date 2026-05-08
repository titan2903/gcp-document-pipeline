import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, FileText, Database, Send, Terminal, Play, Server, Layers, Code2, Search, FilterX } from 'lucide-react';
import { pythonCode, dockerfileCode, requirementsCode, terraformCode, streamlitCode, streamlitRequirementsCode } from './data/snippets';

type Tab = 'simulator' | 'dashboard' | 'python' | 'terraform';
type ActiveStage = 'idle' | 'gcs' | 'pubsub' | 'cloudrun' | 'bq';
type LogEvent = { id: string; timestamp: Date; message: string; type: 'info' | 'success' | 'warn' };
type DocumentRecord = { id: string; filename: string; wCount: number; tags: string[]; date: string; bucket: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('simulator');
  const [activeStage, setActiveStage] = useState<ActiveStage>('idle');
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([
    { id: '1', filename: 'invoice_xyz.pdf', wCount: 230, tags: ['finance', 'invoice'], date: new Date(Date.now() - 3600000).toLocaleTimeString(), bucket: 'incoming-docs-bucket' },
    { id: '2', filename: 'contract_qwe.pdf', wCount: 1540, tags: ['legal', 'confidential'], date: new Date(Date.now() - 7200000).toLocaleTimeString(), bucket: 'incoming-docs-bucket' },
    { id: '3', filename: 'report_2023.docx', wCount: 5040, tags: ['engineering', 'confidential'], date: new Date(Date.now() - 10800000).toLocaleTimeString(), bucket: 'incoming-docs-bucket' },
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredDocuments = useMemo(() => {
    if (!tagFilter.trim()) return documents;
    const filter = tagFilter.toLowerCase().trim();
    return documents.filter(doc => doc.tags.some(tag => tag.toLowerCase().includes(filter)));
  }, [documents, tagFilter]);

  const runSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    const docId = Math.random().toString(36).substring(7);
    const fileName = `invoice_${docId}.pdf`;
    
    const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
      setLogs(prev => [...prev, { id: Math.random().toString(), timestamp: new Date(), message: msg, type }]);
    };

    // Stage 1: Upload to GCS
    setActiveStage('gcs');
    addLog(`User uploading ${fileName} to Cloud Storage bucket...`);
    await new Promise(r => setTimeout(r, 1200));

    // Stage 2: Pub/Sub Trigger
    setActiveStage('pubsub');
    addLog(`GCS Event (OBJECT_FINALIZE) published to Pub/Sub topic...`);
    await new Promise(r => setTimeout(r, 1000));

    // Stage 3: Cloud Run Processor
    setActiveStage('cloudrun');
    addLog(`Pub/Sub Push triggers Cloud Run service.`);
    addLog(`[Python] Downloading ${fileName} from bucket...`);
    await new Promise(r => setTimeout(r, 1000));
    addLog(`[Python] Running OCR and metadata extraction...`);
    await new Promise(r => setTimeout(r, 1500));
    
    // Stage 4: BigQuery Insertion
    setActiveStage('bq');
    const wordCount = Math.floor(Math.random() * 500) + 100;
    const allTags = ['finance', 'legal', 'engineering', 'confidential', 'invoice'];
    const tags = allTags.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    addLog(`[Python] Streaming metadata to BigQuery dataset...`);
    await new Promise(r => setTimeout(r, 1000));
    
    setDocuments(prev => [{
      id: docId,
      filename: fileName,
      wCount: wordCount,
      tags,
      date: new Date().toLocaleTimeString(),
      bucket: 'incoming-docs-bucket'
    }, ...prev]);
    
    addLog(`Successfully processed and stored ${fileName}!`, 'success');
    
    // Reset
    setTimeout(() => {
      setActiveStage('idle');
      setIsSimulating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">GCP Document Pipeline</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide">SERVERLESS EVENT-DRIVEN ARCHITECTURE</p>
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['simulator', 'dashboard', 'python', 'terraform'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 gap-6">
        {activeTab === 'simulator' && (
          <div className="animate-in fade-in duration-300">
            {/* Architecture Diagram Interactive */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex justify-between items-center">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gray-500" /> Architecture Flow
                </h2>
                <button
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition-all active:scale-95"
                >
                  <Play className="w-4 h-4" /> 
                  {isSimulating ? 'Processing Pipeline...' : 'Simulate Upload'}
                </button>
              </div>
              
              <div className="p-12 pb-16 flex items-center justify-between relative max-w-5xl mx-auto overflow-x-auto">
                {/* Node 1: GCS */}
                <StepNode 
                  icon={FileText} 
                  title="Cloud Storage" 
                  desc="Unprocessed bucket"
                  isActive={activeStage === 'gcs'} 
                  color="blue"
                />
                <Connector isActive={activeStage === 'gcs' || activeStage === 'pubsub'} />
                
                {/* Node 2: Pub/Sub */}
                <StepNode 
                  icon={Send} 
                  title="Cloud Pub/Sub" 
                  desc="Object finalize event"
                  isActive={activeStage === 'pubsub'} 
                  color="indigo"
                />
                <Connector isActive={activeStage === 'pubsub' || activeStage === 'cloudrun'} />

                {/* Node 3: Cloud Run */}
                <StepNode 
                  icon={Server} 
                  title="Cloud Run" 
                  desc="Python Processor"
                  isActive={activeStage === 'cloudrun'} 
                  color="purple"
                />
                <Connector isActive={activeStage === 'cloudrun' || activeStage === 'bq'} />

                {/* Node 4: BigQuery */}
                <StepNode 
                  icon={Database} 
                  title="BigQuery" 
                  desc="Metadata Warehouse"
                  isActive={activeStage === 'bq'} 
                  color="emerald"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Logs */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
                <div className="border-b border-gray-100 bg-gray-50/50 p-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-500" /> Pipeline Logs
                  </h3>
                </div>
                <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-gray-900 text-gray-300 space-y-2 rounded-b-xl">
                  {logs.length === 0 && <p className="text-gray-500 italic">Waiting for events...</p>}
                  {logs.map((log) => (
                    <div key={log.id} className={`flex gap-3 ${
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warn' ? 'text-yellow-400' : 'text-blue-300'
                    }`}>
                      <span className="text-gray-600 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* BigQuery Mock Table */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
                <div className="border-b border-gray-100 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" /> processed_docs (BigQuery)
                  </h3>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 font-medium">Filename</th>
                        <th className="px-6 py-3 font-medium">Datetime</th>
                        <th className="px-6 py-3 font-medium">Word Count</th>
                        <th className="px-6 py-3 font-medium">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-400 bg-gray-50/30">
                            No records inserted yet. Run simulation to populate.
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {documents.map((doc) => (
                            <motion.tr 
                              key={doc.id}
                              initial={{ opacity: 0, backgroundColor: '#dcfce7' }}
                              animate={{ opacity: 1, backgroundColor: '#ffffff' }}
                              transition={{ duration: 1.5 }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 font-medium text-gray-900">{doc.filename}</td>
                              <td className="px-6 py-4 text-gray-500 font-mono text-xs">{doc.date}</td>
                              <td className="px-6 py-4 text-gray-600">{doc.wCount}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-1 flex-wrap">
                                  {doc.tags.map(tag => (
                                    <span key={tag} className="bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border text-gray-800 border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ height: '600px' }}>
                <div className="bg-[#f0f2f6] border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-gray-500 font-mono text-xs ml-2">localhost:8501 (Streamlit Preview)</span>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  {/* Streamlit Sidebar */}
                  <div className="w-48 bg-[#f0f2f6] p-4 flex flex-col gap-4 border-r border-[#e6e9ef]">
                    <h3 className="font-semibold text-gray-700 text-sm">Filters</h3>
                    <div>
                      <label className="text-xs text-gray-600 font-medium mb-1 block">Filter by Tag</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={tagFilter}
                          onChange={(e) => setTagFilter(e.target.value)}
                          placeholder="e.g. finance" 
                          className="w-full bg-white border border-gray-300 rounded focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm p-1.5 focus:outline-none"
                        />
                        {tagFilter && (
                          <button onClick={() => setTagFilter('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                            <FilterX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Streamlit Main */}
                  <div className="flex-1 p-6 bg-white overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-gray-800">
                      📄 Processed Documents Viewer
                    </h2>
                    <p className="text-gray-600 text-sm mb-6 pb-4 border-b">
                      View and filter documents processed by the serverless pipeline.
                    </p>
                    
                    <div className="border border-gray-200 rounded text-sm overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                          <tr>
                            <th className="py-2 px-3 font-medium">File Name</th>
                            <th className="py-2 px-3 font-medium">Upload Date</th>
                            <th className="py-2 px-3 font-medium text-right">Word Count</th>
                            <th className="py-2 px-3 font-medium">Tags</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredDocuments.length === 0 ? (
                            <tr><td colSpan={4} className="py-8 text-center text-gray-500">No documents found matching the criteria.</td></tr>
                          ) : (
                            filteredDocuments.map(doc => (
                              <tr key={doc.id} className="hover:bg-gray-50">
                                <td className="py-2 px-3">{doc.filename}</td>
                                <td className="py-2 px-3 text-gray-500">{doc.date}</td>
                                <td className="py-2 px-3 text-right font-mono text-gray-600">{doc.wCount}</td>
                                <td className="py-2 px-3">
                                  <div className="flex gap-1 flex-wrap">
                                    {doc.tags.map(tag => (
                                      <span key={tag} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs border border-gray-200">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Showing {filteredDocuments.length} recent documents</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
               <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <h3 className="font-semibold text-amber-900 mb-2">Streamlit Dashboard</h3>
                <p className="text-sm text-amber-800 opacity-90 leading-relaxed">
                  A pure Python dashboard using Streamlit to query BigQuery and visualize the processed documents. It allows users to filter the results by tag easily.
                </p>
              </div>
              <CodeBlock title="app.py" code={streamlitCode} language="python" />
              <CodeBlock title="requirements.txt" code={streamlitRequirementsCode} language="text" />
            </div>
          </div>
        )}

        {activeTab === 'python' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <h3 className="font-semibold text-blue-900 mb-2">Cloud Run Processor</h3>
                <p className="text-sm text-blue-800 opacity-90 leading-relaxed">
                  This Python service uses Flask to handle Pub/Sub push invocations. It simulates extracting text / metadata from the document payload and streams the results into BigQuery.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm">
                <p className="font-medium text-gray-800 mb-1">Architecture Note:</p>
                <p className="text-gray-600">
                  Cloud Run acts as the serverless compute layer. It scales to zero, charging only when a document triggers a process.
                </p>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              <CodeBlock title="main.py" code={pythonCode} language="python" />
              <CodeBlock title="requirements.txt" code={requirementsCode} language="text" />
              <CodeBlock title="Dockerfile" code={dockerfileCode} language="dockerfile" />
            </div>
          </div>
        )}

        {activeTab === 'terraform' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-4 gap-6">
             <div className="lg:col-span-1 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                <h3 className="font-semibold text-indigo-900 mb-2">GCP Infrastructure</h3>
                <p className="text-sm text-indigo-800 opacity-90 leading-relaxed">
                  Terraform configuration to deploy the requested Event-Driven Architecture. Automates IAM roles, Service Accounts, Pub/Sub, and BigQuery setup.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm">
                 <p className="font-medium text-gray-800 mb-2">Deployment Steps:</p>
                 <ol className="list-decimal pl-4 text-gray-600 space-y-1">
                   <li>Build pushing the Docker image to Container Registry/Artifact Registry.</li>
                   <li>Run <code>terraform init</code></li>
                   <li>Run <code>terraform apply -var="project_id=YOUR_PROJECT"</code></li>
                 </ol>
              </div>
            </div>
            <div className="lg:col-span-3">
              <CodeBlock title="main.tf" code={terraformCode} language="hcl" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-components

function StepNode({ icon: Icon, title, desc, isActive, color }: { icon: any, title: string, desc: string, isActive: boolean, color: string }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600 border-blue-400',
    indigo: 'bg-indigo-100 text-indigo-600 border-indigo-400',
    purple: 'bg-purple-100 text-purple-600 border-purple-400',
    emerald: 'bg-emerald-100 text-emerald-600 border-emerald-400',
    gray: 'bg-gray-50 text-gray-400 border-gray-200'
  };

  return (
    <div className="relative flex flex-col items-center w-32 shrink-0 z-10 text-center">
      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          boxShadow: isActive ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : '0 0 0 0px rgba(59, 130, 246, 0)',
        }}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-3 shadow-sm transition-colors duration-500 ${isActive ? colorMap[color as keyof typeof colorMap] : colorMap['gray']}`}
      >
        <Icon className="w-8 h-8" />
      </motion.div>
      <h4 className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h4>
      <p className="text-[10px] font-medium text-gray-500 uppercase mt-1">{desc}</p>
    </div>
  );
}

function Connector({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-4 relative top-[-16px]">
      {isActive && (
        <motion.div
          initial={{ left: "0%" }}
          animate={{ left: "100%" }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[5px] w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
        />
      )}
    </div>
  );
}

function CodeBlock({ title, code, language }: { title: string, code: string, language: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <Code2 className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="ml-auto text-xs text-gray-400 font-mono">{language}</span>
      </div>
      <pre className="p-4 bg-gray-900 text-gray-50 font-mono text-sm overflow-x-auto whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
