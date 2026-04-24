import { useRef, type ChangeEvent } from 'react';
import { useLocalState } from './useLocalState';

export interface Team {
  id: string;
  name: string;
  group: string;
}
export interface GroupMatch {
  id: string;
  group: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
}
export interface KnockoutMatch {
  id: string;
  round: string;
  slot: number;
  team1Id: string | null;
  team2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
}

function newGroupMatchId(group: string, i: number, j: number): string {
  return `gm${Date.now()}_${group}_${i}_${j}_${Math.random().toString(36).slice(2, 6)}`;
}

const STORAGE_KEYS = [
  'tab',
  'tournName',
  'teams',
  'gMatches',
  'koMatches',
  'newName',
  'newGroup',
  'gEditId',
  'kEditId',
  'es1',
  'es2',
] as const;

function btnPrimaryCls() {
  return 'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500';
}
function btnSecondaryCls() {
  return 'rounded-md border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700';
}
function btnGhostCls() {
  return 'rounded-md px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800';
}

export default function FootballTournament() {
  const importInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useLocalState<string>('tab', 'setup');
  const [tournName, setTournName] = useLocalState<string>('tournName', '足球杯赛 2026');
  const [teams, setTeams] = useLocalState<Team[]>('teams', []);
  const [gMatches, setGMatches] = useLocalState<GroupMatch[]>('gMatches', []);
  const [koMatches, setKoMatches] = useLocalState<KnockoutMatch[]>('koMatches', []);
  const [newName, setNewName] = useLocalState<string>('newName', '');
  const [newGroup, setNewGroup] = useLocalState<string>('newGroup', 'A');
  const [gEditId, setGEditId] = useLocalState<string | null>('gEditId', null);
  const [kEditId, setKEditId] = useLocalState<string | null>('kEditId', null);
  const [es1, setEs1] = useLocalState<string>('es1', '');
  const [es2, setEs2] = useLocalState<string>('es2', '');

  const groups = [...new Set(teams.map((t) => t.group))].sort();
  const byId = (id: string | null | undefined) => teams.find((t) => t.id === id);

  function addTeam() {
    if (!newName.trim()) return;
    setTeams((prev) => [
      ...prev,
      {
        id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        name: newName.trim(),
        group: newGroup,
      },
    ]);
    setNewName('');
  }

  function removeTeam(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    setGMatches((prev) => prev.filter((m) => m.homeId !== id && m.awayId !== id));
  }

  function genGroupMatches() {
    const result: GroupMatch[] = [];
    for (const g of groups) {
      const gt = teams.filter((t) => t.group === g);
      for (let i = 0; i < gt.length; i++) {
        for (let j = i + 1; j < gt.length; j++) {
          const ex = gMatches.find(
            (m) =>
              m.group === g &&
              ((m.homeId === gt[i].id && m.awayId === gt[j].id) ||
                (m.homeId === gt[j].id && m.awayId === gt[i].id)),
          );
          result.push(
            ex ?? {
              id: newGroupMatchId(g, i, j),
              group: g,
              homeId: gt[i].id,
              awayId: gt[j].id,
              homeScore: null,
              awayScore: null,
            },
          );
        }
      }
    }
    setGMatches(result);
  }

  function computeStandings(g: string) {
    const gt = teams.filter((t) => t.group === g);
    const r: Record<
      string,
      { teamId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }
    > = {};
    for (const t of gt) r[t.id] = { teamId: t.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    for (const m of gMatches.filter((m) => m.group === g && m.homeScore !== null)) {
      if (!r[m.homeId] || !r[m.awayId]) continue;
      const h = m.homeScore!;
      const a = m.awayScore!;
      r[m.homeId].p++;
      r[m.awayId].p++;
      r[m.homeId].gf += h;
      r[m.homeId].ga += a;
      r[m.awayId].gf += a;
      r[m.awayId].ga += h;
      if (h > a) {
        r[m.homeId].w++;
        r[m.homeId].pts += 3;
        r[m.awayId].l++;
      } else if (h < a) {
        r[m.awayId].w++;
        r[m.awayId].pts += 3;
        r[m.homeId].l++;
      } else {
        r[m.homeId].d++;
        r[m.homeId].pts++;
        r[m.awayId].d++;
        r[m.awayId].pts++;
      }
    }
    return Object.values(r)
      .map((x) => ({ ...x, gd: x.gf - x.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }

  function genKnockout() {
    const top2ByGroup: Record<string, { first?: string; second?: string }> = {};
    for (const g of groups) {
      const s = computeStandings(g);
      top2ByGroup[g] = { first: s[0]?.teamId, second: s[1]?.teamId };
    }

    const firsts: string[] = [];
    const seconds: string[] = [];
    for (const g of groups) {
      const x = top2ByGroup[g];
      if (x?.first) firsts.push(x.first);
      if (x?.second) seconds.push(x.second);
    }

    const n = Math.min(firsts.length, seconds.length);
    const km: KnockoutMatch[] = [];

    const hasABCD =
      groups.includes('A') &&
      groups.includes('B') &&
      groups.includes('C') &&
      groups.includes('D') &&
      top2ByGroup.A?.first &&
      top2ByGroup.A?.second &&
      top2ByGroup.B?.first &&
      top2ByGroup.B?.second &&
      top2ByGroup.C?.first &&
      top2ByGroup.C?.second &&
      top2ByGroup.D?.first &&
      top2ByGroup.D?.second;

    if (hasABCD) {
      // 半区 1：A1 vs B2，C1 vs D2
      // 半区 2：A2 vs B1，C2 vs D1
      const pairings: Array<[string, string]> = [
        [top2ByGroup.A.first!, top2ByGroup.B.second!],
        [top2ByGroup.C.first!, top2ByGroup.D.second!],
        [top2ByGroup.A.second!, top2ByGroup.B.first!],
        [top2ByGroup.C.second!, top2ByGroup.D.first!],
      ];
      for (let i = 0; i < pairings.length; i++) {
        const [team1Id, team2Id] = pairings[i];
        km.push({
          id: `ko_r1_${i}`,
          round: 'r1',
          slot: i,
          team1Id,
          team2Id,
          score1: null,
          score2: null,
          winnerId: null,
        });
      }
    } else {
      for (let i = 0; i < n; i++) {
        km.push({
          id: `ko_r1_${i}`,
          round: 'r1',
          slot: i,
          team1Id: firsts[i],
          team2Id: seconds[n - 1 - i],
          score1: null,
          score2: null,
          winnerId: null,
        });
      }
    }

    let sz = Math.floor(n / 2),
      r = 2;
    while (sz >= 1) {
      for (let i = 0; i < sz; i++) {
        km.push({
          id: `ko_r${r}_${i}`,
          round: `r${r}`,
          slot: i,
          team1Id: null,
          team2Id: null,
          score1: null,
          score2: null,
          winnerId: null,
        });
      }
      sz = Math.floor(sz / 2);
      r++;
    }
    setKoMatches(km);
  }

  function saveGScore(id: string) {
    const h = parseInt(es1, 10),
      a = parseInt(es2, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) return;
    setGMatches((prev) => prev.map((m) => (m.id === id ? { ...m, homeScore: h, awayScore: a } : m)));
    setGEditId(null);
    setEs1('');
    setEs2('');
  }

  function saveKScore(id: string) {
    const s1 = parseInt(es1, 10),
      s2 = parseInt(es2, 10);
    if (Number.isNaN(s1) || Number.isNaN(s2) || s1 < 0 || s2 < 0 || s1 === s2) return;
    const match = koMatches.find((m) => m.id === id);
    if (!match) return;
    const winnerId = s1 > s2 ? match.team1Id : match.team2Id;
    const updated = koMatches.map((m) =>
      m.id === id ? { ...m, score1: s1, score2: s2, winnerId } : m,
    );
    const nextR = `r${parseInt(match.round.slice(1), 10) + 1}`;
    const nextSlot = Math.floor(match.slot / 2);
    const idx = updated.findIndex((m) => m.round === nextR && m.slot === nextSlot);
    if (idx >= 0)
      updated[idx] = {
        ...updated[idx],
        [match.slot % 2 === 0 ? 'team1Id' : 'team2Id']: winnerId,
      };
    setKoMatches(updated);
    setKEditId(null);
    setEs1('');
    setEs2('');
  }

  function cancelEdit() {
    setGEditId(null);
    setKEditId(null);
    setEs1('');
    setEs2('');
  }

  const koRounds = [...new Set(koMatches.map((m) => m.round))].sort(
    (a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10),
  );
  const totalR = koRounds.length;

  function roundLabel(rnd: string) {
    const n = parseInt(rnd.slice(1), 10);
    if (n === totalR) return '决赛';
    if (n === totalR - 1) return '半决赛';
    if (n === totalR - 2) return '四分之一决赛';
    return `第 ${n} 轮`;
  }

  const tabs = [
    { key: 'setup', label: '设置' },
    { key: 'standings', label: '积分榜' },
    { key: 'scores', label: '比分录入' },
    { key: 'knockout', label: '淘汰赛' },
  ] as const;

  function exportBackup() {
    const payload: Record<string, unknown> = {
      tab,
      tournName,
      teams,
      gMatches,
      koMatches,
      newName,
      newGroup,
      gEditId,
      kEditId,
      es1,
      es2,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `onlyfanscup-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (!Array.isArray(data.teams)) throw new Error('teams');
        for (const k of STORAGE_KEYS) {
          if (Object.prototype.hasOwnProperty.call(data, k)) {
            localStorage.setItem(k, JSON.stringify(data[k]));
          }
        }
        window.location.reload();
      } catch {
        alert('文件格式无效，请使用本页导出的 JSON 备份。');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  const rowBorder = 'border-b border-neutral-800';

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5 p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">{tournName}</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'rounded-full border border-emerald-600 bg-emerald-950/60 px-3 py-1 text-sm text-emerald-100'
                : 'rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-400 hover:border-neutral-500'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <hr className="border-neutral-800" />

      {tab === 'setup' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-[72px] text-sm font-semibold text-neutral-200">赛事名称</span>
            <input
              className="w-60 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-emerald-600"
              value={tournName}
              onChange={(e) => setTournName(e.target.value)}
              placeholder="赛事名称"
            />
          </div>

          <hr className="border-neutral-800" />
          <h2 className="text-lg font-semibold text-neutral-100">球队管理</h2>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-52 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-emerald-600"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入球队名称"
            />
            <select
              className="w-28 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-emerald-600"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
            >
              {'ABCDEFGH'.split('').map((g) => (
                <option key={g} value={g}>
                  {g} 组
                </option>
              ))}
            </select>
            <button type="button" className={btnPrimaryCls()} onClick={addTeam}>
              添加球队
            </button>
          </div>

          {groups.length > 0 && (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(groups.length, 4)}, minmax(0, 1fr))`,
              }}
            >
              {groups.map((g) => {
                const gt = teams.filter((t) => t.group === g);
                return (
                  <div key={g} className="rounded-lg border border-neutral-800 bg-neutral-900/80">
                    <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
                      <span className="text-sm font-semibold text-neutral-100">{g} 组</span>
                      <span className="text-xs text-neutral-500">{gt.length} 队</span>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3">
                      {gt.map((tm) => (
                        <div key={tm.id} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">{tm.name}</span>
                          <button
                            type="button"
                            title="移除"
                            className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
                            onClick={() => removeTeam(tm.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {gt.length === 0 && <span className="text-xs text-neutral-500">暂无球队</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {teams.length === 0 && (
            <p className="text-sm text-neutral-500">请选择分组并添加球队，每组至少 2 支才能生成赛程。</p>
          )}

          {teams.length >= 2 && (
            <div>
              <button type="button" className={btnSecondaryCls()} onClick={genGroupMatches}>
                生成 / 更新小组赛程
              </button>
            </div>
          )}

          <hr className="border-neutral-800" />
          <h2 className="text-lg font-semibold text-neutral-100">数据备份</h2>
          <p className="text-sm text-neutral-500">
            导出 JSON 可换电脑后通过「导入」恢复；数据默认保存在本机浏览器 localStorage。
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondaryCls()} onClick={exportBackup}>
              导出 JSON
            </button>
            <button type="button" className={btnSecondaryCls()} onClick={() => importInputRef.current?.click()}>
              导入 JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportFile}
            />
          </div>
        </div>
      )}

      {tab === 'standings' && (
        <div className="flex flex-col gap-7">
          {groups.length === 0 && <p className="text-sm text-neutral-500">请先在「设置」中添加球队。</p>}
          {groups.map((g) => {
            const s = computeStandings(g);
            return (
              <div key={g} className="flex flex-col gap-2.5">
                <h2 className="text-lg font-semibold text-neutral-100">{g} 组积分榜</h2>
                <div className="overflow-x-auto rounded-lg border border-neutral-800">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900/80 text-left text-neutral-400">
                        <th className="px-2 py-2 text-center" />
                        <th className="px-2 py-2">球队</th>
                        <th className="px-2 py-2 text-center">场</th>
                        <th className="px-2 py-2 text-center">胜</th>
                        <th className="px-2 py-2 text-center">平</th>
                        <th className="px-2 py-2 text-center">负</th>
                        <th className="px-2 py-2 text-center">进球</th>
                        <th className="px-2 py-2 text-center">失球</th>
                        <th className="px-2 py-2 text-center">净胜球</th>
                        <th className="px-2 py-2 text-center">积分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-2 py-4 text-center text-neutral-500">
                            暂无数据
                          </td>
                        </tr>
                      ) : (
                        s.map((row, idx) => {
                          const tm = byId(row.teamId);
                          const gdTone =
                            row.gd > 0 ? 'text-emerald-400' : row.gd < 0 ? 'text-neutral-400' : 'text-neutral-500';
                          return (
                            <tr
                              key={row.teamId}
                              className={idx % 2 === 1 ? 'bg-neutral-900/40' : ''}
                            >
                              <td className="px-2 py-2 text-center align-middle">
                                {idx < 2 ? (
                                  <span className="inline-block rounded-full bg-emerald-950 px-2 py-0.5 text-xs text-emerald-200">
                                    晋级
                                  </span>
                                ) : (
                                  <span className="text-xs text-neutral-500">{idx + 1}</span>
                                )}
                              </td>
                              <td
                                className={
                                  idx < 2
                                    ? 'px-2 py-2 font-semibold text-neutral-100'
                                    : 'px-2 py-2 text-neutral-200'
                                }
                              >
                                {tm?.name ?? '-'}
                              </td>
                              <td className="px-2 py-2 text-center tabular-nums text-neutral-300">{row.p}</td>
                              <td className="px-2 py-2 text-center tabular-nums text-neutral-300">{row.w}</td>
                              <td className="px-2 py-2 text-center tabular-nums text-neutral-300">{row.d}</td>
                              <td className="px-2 py-2 text-center tabular-nums text-neutral-300">{row.l}</td>
                              <td className="px-2 py-2 text-center tabular-nums text-neutral-300">{row.gf}</td>
                              <td className="px-2 py-2 text-center tabular-nums text-neutral-300">{row.ga}</td>
                              <td className={`px-2 py-2 text-center tabular-nums ${gdTone}`}>
                                {row.gd > 0 ? `+${row.gd}` : row.gd}
                              </td>
                              <td className="px-2 py-2 text-center font-bold tabular-nums text-neutral-100">
                                {row.pts}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'scores' && (
        <div className="flex flex-col gap-7">
          {groups.length === 0 && <p className="text-sm text-neutral-500">请先在「设置」中添加球队。</p>}
          {groups.map((g) => {
            const ms = gMatches.filter((m) => m.group === g);
            const played = ms.filter((m) => m.homeScore !== null).length;
            return (
              <div key={g} className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-neutral-100">{g} 组赛程</h2>
                  {ms.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      {played}/{ms.length} 场已录入
                    </span>
                  )}
                </div>
                {ms.length === 0 && (
                  <p className="text-xs text-neutral-500">请先在「设置」中生成赛程。</p>
                )}
                <div className="flex flex-col">
                  {ms.map((match) => {
                    const home = byId(match.homeId);
                    const away = byId(match.awayId);
                    const isEditing = gEditId === match.id;
                    const isPlayed = match.homeScore !== null;
                    const homeWon = isPlayed && match.homeScore! > match.awayScore!;
                    const awayWon = isPlayed && match.awayScore! > match.homeScore!;
                    return (
                      <div
                        key={match.id}
                        className={`flex flex-wrap items-center gap-2 py-2.5 pl-1 ${rowBorder}`}
                      >
                        <span
                          className={`w-[180px] text-right text-sm ${
                            homeWon ? 'font-semibold text-neutral-50' : 'text-neutral-200'
                          }`}
                        >
                          {home?.name ?? '-'}
                        </span>
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              type="number"
                              className="w-12 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm"
                              value={es1}
                              onChange={(e) => setEs1(e.target.value)}
                            />
                            <span className="font-semibold text-neutral-500">:</span>
                            <input
                              type="number"
                              className="w-12 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm"
                              value={es2}
                              onChange={(e) => setEs2(e.target.value)}
                            />
                            <button type="button" className={btnPrimaryCls()} onClick={() => saveGScore(match.id)}>
                              确认
                            </button>
                            <button type="button" className={btnGhostCls()} onClick={cancelEdit}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`min-w-[76px] text-center text-sm font-semibold ${
                                isPlayed ? 'text-emerald-300' : 'text-neutral-500'
                              }`}
                            >
                              {isPlayed ? `${match.homeScore}  :  ${match.awayScore}` : 'vs'}
                            </span>
                            <button
                              type="button"
                              className={btnGhostCls()}
                              onClick={() => {
                                setGEditId(match.id);
                                setEs1(match.homeScore !== null ? String(match.homeScore) : '');
                                setEs2(match.awayScore !== null ? String(match.awayScore) : '');
                              }}
                            >
                              {isPlayed ? '修改' : '录入'}
                            </button>
                          </div>
                        )}
                        <span
                          className={`w-[180px] text-sm ${awayWon ? 'font-semibold text-neutral-50' : 'text-neutral-200'}`}
                        >
                          {away?.name ?? '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {groups.length > 0 && (
            <div className="pt-2">
              <button type="button" className={btnSecondaryCls()} onClick={genKnockout}>
                根据积分榜生成淘汰赛
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'knockout' && (
        <div className="flex flex-col gap-7">
          {koMatches.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-neutral-500">
                请先完成小组赛比分录入，然后点击「比分录入」页底部的「根据积分榜生成淘汰赛」。
              </p>
              <p className="text-xs text-neutral-600">
                每组积分榜前 2 名晋级淘汰赛，淘汰赛单场决出胜负（不接受平局）。
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const fin = koMatches.find((m) => m.round === koRounds[totalR - 1]);
                const champ = fin?.winnerId ? byId(fin.winnerId) : null;
                if (!champ) return null;
                return (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/80">
                    <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
                      <span className="text-sm font-semibold text-neutral-100">本届赛事冠军</span>
                      <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs text-emerald-200">冠军</span>
                    </div>
                    <div className="p-3">
                      <p className="text-lg font-bold text-neutral-50">{champ.name}</p>
                    </div>
                  </div>
                );
              })()}

              {koRounds.map((round) => {
                const roundMatches = koMatches.filter((m) => m.round === round);
                const doneCount = roundMatches.filter((m) => m.score1 !== null).length;
                return (
                  <div key={round} className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-neutral-100">{roundLabel(round)}</h2>
                      <span className="text-xs text-neutral-500">
                        {doneCount}/{roundMatches.length} 场
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {roundMatches.map((match) => {
                        const t1 = byId(match.team1Id);
                        const t2 = byId(match.team2Id);
                        const isEditing = kEditId === match.id;
                        const isPlayed = match.score1 !== null;
                        const t1Won = match.winnerId === match.team1Id;
                        const t2Won = match.winnerId === match.team2Id;
                        return (
                          <div
                            key={match.id}
                            className={`flex flex-wrap items-center gap-2 py-2.5 pl-1 ${rowBorder}`}
                          >
                            <span
                              className={`w-[180px] text-right text-sm ${
                                t1Won ? 'font-semibold text-neutral-50' : 'font-normal text-neutral-200'
                              } ${!t1 ? 'text-neutral-500' : ''}`}
                            >
                              {t1?.name ?? '待定'}
                            </span>
                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <input
                                  type="number"
                                  className="w-12 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm"
                                  value={es1}
                                  onChange={(e) => setEs1(e.target.value)}
                                />
                                <span className="font-semibold text-neutral-500">:</span>
                                <input
                                  type="number"
                                  className="w-12 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-sm"
                                  value={es2}
                                  onChange={(e) => setEs2(e.target.value)}
                                />
                                <button type="button" className={btnPrimaryCls()} onClick={() => saveKScore(match.id)}>
                                  确认
                                </button>
                                <button type="button" className={btnGhostCls()} onClick={cancelEdit}>
                                  取消
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`min-w-[76px] text-center text-sm font-semibold ${
                                    isPlayed ? 'text-emerald-300' : 'text-neutral-500'
                                  }`}
                                >
                                  {isPlayed ? `${match.score1}  :  ${match.score2}` : 'vs'}
                                </span>
                                {t1 && t2 && (
                                  <button
                                    type="button"
                                    className={btnGhostCls()}
                                    onClick={() => {
                                      setKEditId(match.id);
                                      setEs1(match.score1 !== null ? String(match.score1) : '');
                                      setEs2(match.score2 !== null ? String(match.score2) : '');
                                    }}
                                  >
                                    {isPlayed ? '修改' : '录入'}
                                  </button>
                                )}
                              </div>
                            )}
                            <span
                              className={`w-[180px] text-sm ${
                                t2Won ? 'font-semibold text-neutral-50' : 'font-normal text-neutral-200'
                              } ${!t2 ? 'text-neutral-500' : ''}`}
                            >
                              {t2?.name ?? '待定'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
