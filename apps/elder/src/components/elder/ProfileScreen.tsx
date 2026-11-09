"use client";

import { ElderSessionGate } from "./ElderSessionGate";
import { ProfileEditor } from "./ProfileEditor";

export function ProfileScreen() {
  return (
    <ElderSessionGate>
      {(elder) => <ProfileEditor elder={elder} />}
    </ElderSessionGate>
  );
}
