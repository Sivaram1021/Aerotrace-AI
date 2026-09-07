import React, { useState, useEffect } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  RotateCcw,
  BarChart3,
  MapPin,
  Activity,
  FileText,
  Compass
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform
} from 'framer-motion';

// Render FastAPI backend
const API_BASE_URL = 'https://aerotrace-ai.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const [weather, setWeather] = useState({
    wind_speed: 12,
    wind_direction: 'North'
  });

  const [sensors, setSensors] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [isLeaking, setIsLeaking] = useState(false);
  const [eventLogs, setEventLogs] = useState([]);

  // Parallax scroll setup
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 1000], [0, 300]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -250]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 150]);

  // Sensor positions on map
  const sensorCoordinates = {
    NODE_01: {
      x: 220,
      y: 150,
      label: 'CNG Pipeline Junc.'
    },
    NODE_02: {
      x: 450,
      y: 320,
      label: 'City Landfill'
    },
    NODE_03: {
      x: 620,
      y: 180,
      label: 'Livestock Perimeter'
    }
  };

  // Fetch telemetry data from Render backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/telemetry`
        );

        if (!res.ok) {
          throw new Error(`Telemetry request failed: ${res.status}`);
        }

        const data = await res.json();

        setWeather(data.weather);
        setSensors(data.sensors);

        const timeLabel = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        const newPoint = {
          time: timeLabel
        };

        data.sensors.forEach((sensor) => {
          newPoint[sensor.node_id] = sensor.ppm;

          // Detect critical leak
          if (sensor.alert_level === 'red') {
            setIsLeaking(true);

            setEventLogs((prev) => {
              if (
                prev.length > 0 &&
                prev[0].status === 'Active' &&
                prev[0].node === sensor.node_id
              ) {
                return prev;
              }

              return [
                {
                  id: Date.now(),
                  timestamp: timeLabel,
                  node: sensor.node_id,
                  ppm: sensor.ppm,
                  severity: 'CRITICAL',
                  source: sensor.attribution,
                  status: 'Active'
                },
                ...prev
              ].slice(0, 10);
            });
          }
        });

        setTimelineData((prev) => [
          ...prev,
          newPoint
        ].slice(-25));

      } catch (err) {
        console.error('Telemetry ingest failed:', err);
      }
    };

    // Fetch immediately
    fetchData();

    // Fetch every 2 seconds
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  // Trigger leak
  const triggerLeak = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/trigger-leak`,
        {
          method: 'POST'
        }
      );

      if (!res.ok) {
        throw new Error(`Trigger leak failed: ${res.status}`);
      }

      setIsLeaking(true);

    } catch (err) {
      console.error('Failed to trigger leak:', err);
    }
  };

  // Acknowledge alert / dispatch team
  const acknowledgeAlert = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/acknowledge`,
        {
          method: 'POST'
        }
      );

      if (!res.ok) {
        throw new Error(`Acknowledge failed: ${res.status}`);
      }

      setEventLogs((prev) =>
        prev.map((log) =>
          log.status === 'Active'
            ? {
                ...log,
                status: 'Mitigated'
              }
            : log
        )
      );

    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Reset system
  const resetSystem = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/reset`,
        {
          method: 'POST'
        }
      );

      if (!res.ok) {
        throw new Error(`Reset failed: ${res.status}`);
      }

      setIsLeaking(false);

    } catch (err) {
      console.error('Failed to reset system:', err);
    }
  };

  // Convert wind direction to angle
  const getWindAngle = (direction) => {
    const angles = {
      North: 0,
      East: 90,
      South: 180,
      West: 270
    };

    return angles[direction] ?? 45;
  };

  // Page animation
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
      filter: 'blur(8px)'
    },

    animate: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    },

    exit: {
      opacity: 0,
      y: -20,
      filter: 'blur(8px)',
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">

      {/* Animated Parallax Background Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">

        <motion.div
          style={{ y: y1 }}
          className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-900/20 rounded-full blur-[120px]"
        />

        <motion.div
          style={{ y: y2 }}
          className="absolute top-[40%] right-[-5%] w-[30rem] h-[30rem] bg-emerald-900/10 rounded-full blur-[100px]"
        />

        <motion.div
          style={{ y: y3 }}
          className="absolute bottom-[-20%] left-[20%] w-[35rem] h-[35rem] bg-rose-900/10 rounded-full blur-[100px]"
        />

      </div>

      <div className="relative z-10 flex flex-col h-full min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-50 bg-slate-950/60 backdrop-blur-xl border-b border-slate-800/50 px-8 py-4 flex items-center justify-between shadow-2xl">

          <div className="flex items-center space-x-3">

            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.4 }}
              className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/40"
            >
              <Activity className="w-6 h-6 text-blue-400" />
            </motion.div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                METHANE WATCH

                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                  v3.0 UI
                </span>
              </h1>

              <p className="text-xs text-slate-400">
                Hyperlocal Sensor Grid & Source Attribution Engine
              </p>
            </div>

          </div>

          <div className="flex items-center space-x-6 bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50 shadow-inner">

            <div className="flex items-center space-x-2">

              <motion.div
                animate={{
                  rotate: getWindAngle(weather.wind_direction)
                }}
                transition={{ type: 'spring' }}
              >
                <Compass className="w-5 h-5 text-teal-400" />
              </motion.div>

              <span className="text-xs font-semibold text-slate-300">
                Wind: {weather.wind_speed} km/h{' '}
                {weather.wind_direction}
              </span>

            </div>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center space-x-2">

              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />

              <span className="text-xs text-slate-300 font-mono">
                Edge Active
              </span>

            </div>

          </div>

        </header>

        <div className="flex-1 flex flex-col px-8 py-8 max-w-7xl mx-auto w-full space-y-8 pb-32">

          {/* Navigation and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/50 pb-4">

            <div className="flex space-x-2 bg-slate-900/50 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/50">

              {[
                'overview',
                'graphs',
                'map',
                'logs'
              ].map((tab) => (

                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >

                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50"
                    />
                  )}

                  <span className="relative z-10 capitalize flex items-center gap-2">

                    {tab === 'overview' && (
                      <Activity className="w-4 h-4" />
                    )}

                    {tab === 'graphs' && (
                      <BarChart3 className="w-4 h-4" />
                    )}

                    {tab === 'map' && (
                      <MapPin className="w-4 h-4" />
                    )}

                    {tab === 'logs' && (
                      <FileText className="w-4 h-4" />
                    )}

                    {tab}

                  </span>

                </button>

              ))}

            </div>

            <div className="flex items-center space-x-3">

              {/* Inject Leak */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerLeak}
                disabled={isLeaking}
                className="flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-lg text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-rose-900/20"
              >
                <ShieldAlert className="mr-2 w-4 h-4" />
                Inject Leak
              </motion.button>

              {/* Dispatch Team */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={acknowledgeAlert}
                disabled={!isLeaking}
                className="flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-amber-900/20"
              >
                <Wrench className="mr-2 w-4 h-4" />
                Dispatch Team
              </motion.button>

              {/* Reset */}
              <motion.button
                whileHover={{ rotate: 180 }}
                onClick={resetSystem}
                className="p-2 bg-slate-800/50 backdrop-blur-md hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>

            </div>

          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">

            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >

              {/* OVERVIEW */}
              {activeTab === 'overview' && (

                <div className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {sensors.map((sensor, i) => (

                      <motion.div
                        key={sensor.node_id}
                        initial={{
                          opacity: 0,
                          y: 20
                        }}
                        animate={{
                          opacity: 1,
                          y: 0
                        }}
                        transition={{
                          delay: i * 0.1
                        }}
                        whileHover={{
                          y: -5
                        }}
                        className={`relative overflow-hidden p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between ${
                          sensor.alert_level === 'red'
                            ? 'bg-rose-950/40 border-rose-500/50 shadow-2xl shadow-rose-900/20'
                            : sensor.alert_level === 'yellow'
                              ? 'bg-amber-950/20 border-amber-500/30'
                              : 'bg-slate-900/40 border-slate-700/50'
                        }`}
                      >

                        {sensor.alert_level === 'red' && (
                          <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />
                        )}

                        <div className="relative z-10">

                          <div className="flex justify-between items-start mb-4">

                            <div>

                              <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                                {sensor.node_id}
                              </span>

                              <h2 className="text-xl font-bold text-white mt-1">
                                {sensor.location}
                              </h2>

                            </div>

                            {sensor.alert_level === 'red' ? (

                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1]
                                }}
                                transition={{
                                  repeat: Infinity
                                }}
                                className="p-2 rounded-xl bg-rose-500/20 text-rose-400"
                              >
                                <AlertTriangle className="w-6 h-6" />
                              </motion.div>

                            ) : (

                              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>

                            )}

                          </div>

                          <div className="flex items-baseline space-x-2 my-6">

                            <span className="text-5xl font-black tracking-tighter text-white font-mono drop-shadow-md">
                              {sensor.ppm}
                            </span>

                            <span className="text-sm font-medium text-slate-400">
                              ppm CH₄
                            </span>

                          </div>

                        </div>

                        <div
                          className={`relative z-10 p-4 rounded-xl text-xs leading-relaxed border backdrop-blur-md ${
                            sensor.alert_level === 'red'
                              ? 'bg-rose-900/40 border-rose-700/50 text-rose-100'
                              : 'bg-slate-950/60 border-slate-800/50 text-slate-300'
                          }`}
                        >

                          <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                            AI Attribution
                          </span>

                          {sensor.attribution}

                        </div>

                      </motion.div>

                    ))}

                  </div>

                </div>

              )}

              {/* GRAPHS */}
              {activeTab === 'graphs' && (

                <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl">

                  <h3 className="text-xl font-bold text-white mb-6">
                    Multi-Sensor Telemetry
                  </h3>

                  <div className="h-96 w-full">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <LineChart data={timelineData}>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#334155"
                          opacity={0.3}
                          vertical={false}
                        />

                        <XAxis
                          dataKey="time"
                          stroke="#64748b"
                          textAnchor="end"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <YAxis
                          stroke="#64748b"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid #334155',
                            borderRadius: '12px'
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="NODE_01"
                          stroke="#f43f5e"
                          strokeWidth={3}
                          dot={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="NODE_02"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 5"
                        />

                        <Line
                          type="monotone"
                          dataKey="NODE_03"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />

                      </LineChart>

                    </ResponsiveContainer>

                  </div>

                </div>

              )}

              {/* MAP */}
              {activeTab === 'map' && (

                <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl flex flex-col items-center">

                  <div className="w-full h-[500px] bg-slate-950/80 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center">

                    {/* Map grid */}
                    <svg
                      className="absolute inset-0 w-full h-full stroke-slate-800/30"
                      xmlns="http://www.w3.org/2000/svg"
                    >

                      <defs>

                        <pattern
                          id="grid"
                          width="40"
                          height="40"
                          patternUnits="userSpaceOnUse"
                        >

                          <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            strokeWidth="1"
                          />

                        </pattern>

                      </defs>

                      <rect
                        width="100%"
                        height="100%"
                        fill="url(#grid)"
                      />

                    </svg>

                    {/* Sensor map */}
                    <svg className="absolute inset-0 w-full h-full drop-shadow-2xl">

                      {sensors.map((sensor) => {

                        const coords =
                          sensorCoordinates[sensor.node_id];

                        if (!coords) {
                          return null;
                        }

                        const isCritical =
                          sensor.alert_level === 'red';

                        return (

                          <g key={sensor.node_id}>

                            {/* Methane plume */}
                            {isCritical && (

                              <motion.ellipse
                                initial={{
                                  opacity: 0,
                                  scale: 0
                                }}
                                animate={{
                                  opacity: 0.6,
                                  scale: 1
                                }}
                                transition={{
                                  duration: 1
                                }}
                                cx={coords.x}
                                cy={coords.y - 30}
                                rx={weather.wind_speed * 5}
                                ry={35}
                                fill="url(#plumeGradient)"
                                className="animate-pulse"
                                style={{
                                  transformOrigin: `${coords.x}px ${coords.y}px`,
                                  transform: `rotate(${
                                    getWindAngle(
                                      weather.wind_direction
                                    ) - 90
                                  }deg)`
                                }}
                              />

                            )}

                            {/* Sensor point */}
                            <circle
                              cx={coords.x}
                              cy={coords.y}
                              r={10}
                              fill={
                                isCritical
                                  ? '#f43f5e'
                                  : '#10b981'
                              }
                            />

                            {/* Critical pulse */}
                            {isCritical && (

                              <circle
                                cx={coords.x}
                                cy={coords.y}
                                r={25}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="2"
                                className="animate-ping"
                                opacity="0.6"
                              />

                            )}

                            {/* Sensor label */}
                            <text
                              x={coords.x + 20}
                              y={coords.y + 5}
                              fill="#f8fafc"
                              fontSize="13"
                              fontWeight="bold"
                              style={{
                                textShadow:
                                  '0px 2px 4px rgba(0,0,0,0.8)'
                              }}
                            >
                              {coords.label} ({sensor.ppm} ppm)
                            </text>

                          </g>

                        );
                      })}

                      {/* Plume gradient */}
                      <defs>

                        <radialGradient id="plumeGradient">

                          <stop
                            offset="0%"
                            stopColor="#f43f5e"
                          />

                          <stop
                            offset="100%"
                            stopColor="#f43f5e"
                            stopOpacity="0"
                          />

                        </radialGradient>

                      </defs>

                    </svg>

                  </div>

                </div>

              )}

              {/* LOGS */}
              {activeTab === 'logs' && (

                <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl">

                  <table className="w-full text-left text-sm font-mono">

                    <thead className="text-slate-400 uppercase border-b border-slate-700/50">

                      <tr>
                        <th className="p-4">Time</th>
                        <th className="p-4">Node</th>
                        <th className="p-4">PPM</th>
                        <th className="p-4">Status</th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-800/50 text-slate-200">

                      {eventLogs.map((log) => (

                        <motion.tr
                          initial={{
                            opacity: 0,
                            x: -10
                          }}
                          animate={{
                            opacity: 1,
                            x: 0
                          }}
                          key={log.id}
                          className="hover:bg-slate-800/30"
                        >

                          <td className="p-4 text-slate-400">
                            {log.timestamp}
                          </td>

                          <td className="p-4 font-bold">
                            {log.node}
                          </td>

                          <td className="p-4 text-rose-400 font-bold">
                            {log.ppm}
                          </td>

                          <td className="p-4">

                            <span
                              className={`px-3 py-1 rounded-full border ${
                                log.status === 'Mitigated'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {log.status}
                            </span>

                          </td>

                        </motion.tr>

                      ))}

                    </tbody>

                  </table>

                  {eventLogs.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No critical events recorded yet.
                    </div>
                  )}

                </div>

              )}

            </motion.div>

          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}