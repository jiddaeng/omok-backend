import { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = "http://localhost:5000";
const BOARD_SIZE = 9;

type ScreenType = "AUTH" | "LOBBY" | "GAME";

interface ProfileType {
  id: number;
  username: string;
  wins: number;
  losses: number;
}

interface ChaksooData {
  x: number;
  y: number;
  color: "black" | "white";
}

export default function App() {
  const [screen, setScreen] = useState<ScreenType>("AUTH");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const [matchStatus, setMatchStatus] = useState("대기실 대기 중...");
  const [isMatching, setIsMatching] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [myColor, setMyColor] = useState<"black" | "white" | "">("");
  const [currentTurn, setCurrentTurn] = useState<"black" | "white">("black");
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [logs, setLogs] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // 1단계 이펙트: 토큰을 발급받으면 무조건 단 한 번 소켓 연결을 수립합니다.
  useEffect(() => {
    if (!accessToken) return;

    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL, {
        auth: { token: accessToken },
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [accessToken]);

  // 2단계 이펙트: 소켓 객체와 프로필 정보가 완전히 준비되면 이벤트 리스너를 결합합니다.
  useEffect(() => {
    if (!profile || !socketRef.current) return;

    const socket = socketRef.current;

    socket.on("connect", () => {
      setLogs((prev) => [...prev, "[시스템] 서버와 소켓 연결 성공"]);
    });

    socket.on("match_complete", (data: { roomid: string, player1id: number, player2id: number }) => {
      console.log("🎉 매칭 완료 신호 수신:", data);

      const myId = Number(profile.id);
      const p1Id = Number(data.player1id);
      const p2Id = Number(data.player2id);

      if (myId === p1Id || myId === p2Id) {
        setRoomId(data.roomid);
        setMatchStatus("매칭 완료! 방으로 진입합니다.");
        setIsMatching(false);
        socket.emit("join", { roomid: data.roomid });
      }
    });

    socket.on("joined", (data: { color: "black" | "white" }) => {
      setMyColor(data.color);
      setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
      setLogs(["[게임] 대국이 시작되었습니다. 매너 게임 하세요!"]);
      setScreen("GAME");
    });

    socket.on("message", (msg: string) => {
      setLogs((prev) => [...prev, `[안내] ${msg}`]);
    });

    socket.on("chaksooed", (data: ChaksooData) => {
      const stoneColor = data.color === "black" ? "흑돌" : "백돌";
      setLogs((prev) => [...prev, `[착수] ${stoneColor} ➡️ (${data.x + 1}, ${data.y + 1})`]);
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((row) => [...row]);
        newBoard[data.y][data.x] = data.color;
        return newBoard;
      });
      setCurrentTurn(data.color === "black" ? "white" : "black");
    });

    socket.on("error", (errMsg: string) => {
      alert(`[에러]: ${errMsg}`);
      setIsMatching(false);
    });

    socket.on("resigned", (data: { color: string }) => {
      const loser = data.color === "black" ? "흑색" : "백색";
      alert(`${loser} 플레이어가 기권하여 게임이 종료되었습니다.`);
      setScreen("LOBBY");
      setMatchStatus("대기실 대기 중...");
      fetchProfile(accessToken);
    });

    return () => {
      socket.off("connect");
      socket.off("match_complete");
      socket.off("joined");
      socket.off("message");
      socket.off("chaksooed");
      socket.off("error");
      socket.off("resigned");
    };
  }, [profile]);


  const handleRegister = async () => {
    if (!username || !password) return alert("아이디와 비밀번호를 입력하세요.");
    try {
      const res = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert("서버 연결 실패");
    }
  };

  const handleLogin = async () => {
    if (!username || !password) return alert("아이디와 비밀번호를 입력하세요.");
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.status === 200) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        fetchProfile(data.accessToken);
      } else {
        const data = await res.json();
        alert(data.message || "로그인 실패");
      }
    } catch (err) {
      alert("서버 연결 실패");
    }
  };

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200) {
        const data = await res.json();
        setProfile(data);
        setScreen("LOBBY");
      }
    } catch (err) {
      console.error("프로필 로드 실패", err);
    }
  };

  const startMatching = () => {
    if (!socketRef.current) {
      alert("서버와 소켓 연결이 끊어져 있습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }

    setIsMatching(true);
    setMatchStatus("적절한 상대를 검색하고 있습니다...");
    socketRef.current.emit("request_match");
  };

  const handleCellClick = (x: number, y: number) => {
    if (!socketRef.current || !roomId || !myColor) return;
    socketRef.current.emit("chaksoo", { roomid: roomId, x, y, color: myColor });
  };

  const handleResign = () => {
    if (!socketRef.current || !roomId || !myColor) return;
    if (window.confirm("정말 기권하시겠습니까? 패배가 기록됩니다.")) {
      socketRef.current.emit("resign", { roomid: roomId, color: myColor });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col justify-center items-center font-sans select-none antialiased">
      
      {/* ==================== 1. 로그인 / 회원가입 화면 ==================== */}
      {screen === "AUTH" && (
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 transform transition-all">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
              GOMOKU ONLINE
            </h2>
            <p className="text-slate-400 text-sm mt-2">온라인 실시간 멀티플레이 오목</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">아이디</label>
              <input type="text" placeholder="Username" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500 transition-colors" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">비밀번호</label>
              <input type="password" placeholder="••••••••" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500 transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button onClick={handleRegister} className="w-1/2 bg-slate-700 hover:bg-slate-600 text-slate-200 p-3 rounded-xl font-bold transition-all active:scale-95 cursor-pointer">
                회원가입
              </button>
              <button onClick={handleLogin} className="w-1/2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white p-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-teal-500/20 cursor-pointer">
                로그인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. 로비 / 매치메이킹 대기실 ==================== */}
      {screen === "LOBBY" && (
        <div className="w-full max-w-xl flex flex-col gap-6 transform transition-all animate-fade-in">
          {profile && (
            <div className="w-full bg-slate-800 p-5 rounded-2xl shadow-xl border border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">플레이어</span>
                <h3 className="text-xl font-extrabold text-teal-400">{profile.username} 님</h3>
              </div>
              <div className="bg-slate-950 px-4 py-2 rounded-xl text-right border border-slate-800">
                <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">전적 통계</span>
                <p className="text-sm font-mono mt-0.5">
                  <span className="text-emerald-400 font-bold">{profile.wins}승</span>
                  <span className="text-slate-500 px-2">/</span>
                  <span className="text-rose-400 font-bold">{profile.losses}패</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-800 p-10 rounded-2xl shadow-xl border border-slate-700 text-center flex flex-col items-center py-14">
            <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-full flex items-center justify-center text-2xl mb-4 animate-pulse">
              ⚔️
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">글로벌 매치메이킹</h2>
            <p className="text-slate-400 mb-8 min-h-[24px] font-medium text-sm">{matchStatus}</p>
            
            <button 
              onClick={startMatching} 
              disabled={isMatching} 
              className={`w-full max-w-xs py-4 rounded-xl text-lg font-bold text-white transition-all transform active:scale-95 shadow-xl cursor-pointer ${
                isMatching 
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed animate-pulse shadow-none" 
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20"
              }`}
            >
              {isMatching ? "적 탐색 중..." : "대전 상대 찾기"}
            </button>
          </div>
        </div>
      )}

      {/* ==================== 3. 실시간 오목 게임 화면 ==================== */}
      {screen === "GAME" && (
        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 items-stretch animate-fade-in">
          
          {/* 바둑판 플레이 존 (좌측) */}
          <div className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 flex flex-col items-center justify-center flex-1">
            
            {/* 상태 바 개편 */}
            <div className="w-full flex justify-between items-center mb-6 bg-slate-950 px-5 py-3 rounded-xl border border-slate-800 text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">내 진영:</span>
                <div className={`w-3.5 h-3.5 rounded-full ${myColor === "black" ? "bg-black ring-1 ring-slate-600" : "bg-white"}`} />
                <span className={myColor === "black" ? "text-slate-200" : "text-white"}>
                  {myColor === "black" ? "흑돌 (선공)" : "백돌 (후공)"}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">턴 차례:</span>
                <div className={`w-3.5 h-3.5 rounded-full ${currentTurn === "black" ? "bg-black ring-1 ring-slate-600" : "bg-white"}`} />
                <span className={`animate-pulse ${currentTurn === myColor ? "text-teal-400" : "text-amber-400"}`}>
                  {currentTurn === myColor ? "내 차례입니다!" : "상대방 생각 중"}
                </span>
              </div>
            </div>

            {/* 🔥 전통 기원 스타일의 9x9 오목판 격자 디테일 */}
            <div 
              className="relative p-1 rounded-md shadow-inner-custom select-none"
              style={{
                backgroundColor: '#dfaa6b', 
                backgroundImage: `
                  linear-gradient(90deg, rgba(40,24,8,0.4) 1px, transparent 1px),
                  linear-gradient(rgba(40,24,8,0.4) 1px, transparent 1px)
                `, 
                backgroundSize: '44px 44px', 
                backgroundPosition: '22px 22px', 
                width: '396px', 
                height: '396px', 
                border: '3px solid #6b3e15' 
              }}
            >
              <div 
                className="grid h-full w-full"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
                  gap: '4px',
                  position: 'relative',
                  zIndex: 10
                }}
              >
                {board.map((row, y) =>
                  row.map((cell, x) => (
                    <button
                      key={`${x}-${y}`}
                      onClick={() => handleCellClick(x, y)}
                      className="w-10 h-10 flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10 rounded-sm"
                      style={{ background: 'none', border: 'none' }}
                    >
                      {cell && (
                        <div
                          className="w-9 h-9 rounded-full transform scale-95 transition-all"
                          style={{
                            backgroundImage: cell === "black"
                              ? 'radial-gradient(circle at 35% 35%, #444 0%, #0a0a0a 70%, #000 100%)'
                              : 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f0f0f0 60%, #dcdcdc 100%)',
                            boxShadow: '1px 3px 5px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(0,0,0,0.2)'
                          }}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 대국 정보 및 실시간 대국 로그 창 (우측) */}
          <div className="w-full lg:w-80 bg-slate-800 p-6 rounded-2xl shadow-2xl border border-slate-700 flex flex-col justify-between items-stretch">
            <div className="flex flex-col h-full">
              <h3 className="text-md font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                실시간 게임 로그
              </h3>
              
              <div className="flex-1 min-h-[250px] lg:h-0 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2 font-mono scrollbar-thin">
                {logs.map((log, index) => {
                  let logClass = "text-slate-400";
                  if (log.includes("[착수]")) logClass = "text-teal-400 font-semibold";
                  if (log.includes("[시스템]")) logClass = "text-blue-400";
                  if (log.includes("[안내]")) logClass = "text-amber-400";

                  return (
                    <p key={index} className={`${logClass} leading-relaxed border-b border-slate-900/50 pb-1`}>
                      {log}
                    </p>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleResign}
              className="w-full mt-5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white p-3.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-rose-950/20 text-sm cursor-pointer"
            >
              🏳️ 기권하기 (패배 처리)
            </button>
          </div>

        </div>
      )}
    </div>
  );
}