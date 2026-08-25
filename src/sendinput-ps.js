const MOD_VK = { ctrl: 0x11, alt: 0x12, shift: 0x10, win: 0x5b };

export function buildSendInputSource({ mods, vk }) {
  const seq = [];
  if (mods) for (const name of ['ctrl', 'alt', 'shift', 'win']) if (mods[name]) seq.push({ vk: MOD_VK[name], isUp: false });
  seq.push({ vk, isUp: false });
  if (mods) for (const name of ['win', 'shift', 'alt', 'ctrl']) if (mods[name]) seq.push({ vk: MOD_VK[name], isUp: true });
  seq.push({ vk, isUp: true });

  const hexVk = (v) => `0x${v.toString(16).toUpperCase().padStart(2, '0')}`;
  const entries = seq
    .map(({ vk: v, isUp }) => `@{ vk = ${hexVk(v)}; isUp = ${isUp ? '$true' : '$false'} }`)
    .join(';\n  ');

  return `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
[StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx, dy; public uint mouseData; public uint dwFlags, time; public IntPtr dwExtraInfo; }
[StructLayout(LayoutKind.Sequential)] public struct HARDWAREINPUT { public uint uMsg; public ushort wParamL, wParamH; }
[StructLayout(LayoutKind.Explicit)] public struct INPUTUNION { [FieldOffset(0)] public KEYBDINPUT ki; [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public HARDWAREINPUT hi; }
[StructLayout(LayoutKind.Sequential)] public struct INPUT { public int type; public INPUTUNION u; }
public static class K { [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size); }';
$seq = @(
${entries}
);
$in = New-Object 'INPUT[]' @($seq.Count);
for ($i = 0; $i -lt $seq.Count; $i++) {
  $kbd = New-Object 'KEYBDINPUT';
  $kbd.wVk = $seq[$i].vk;
  if ($seq[$i].isUp) { $kbd.dwFlags = 2 } else { $kbd.dwFlags = 0 }
  $u = New-Object 'INPUTUNION';
  $u.ki = $kbd;
  $tmp = New-Object 'INPUT';
  $tmp.type = 1;
  $tmp.u = $u;
  $in[$i] = $tmp;
}
$size = [System.Runtime.InteropServices.Marshal]::SizeOf($in[0]);
for ($i = 0; $i -lt $seq.Count; $i++) {
  [K]::SendInput(1, $in[$i], $size) | Out-Null
}
`;
}
