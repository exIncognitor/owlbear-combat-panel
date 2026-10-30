import { test, expect } from "@playwright/test";

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    console.log(
      "Local SDK host diagnostics",
      await page.locator("#messages").textContent(),
    );
    for (const frame of page.frames()) {
      console.log(
        "Frame",
        frame.url(),
        await frame.locator("body").innerText(),
      );
    }
  }
});

// Exercise the actual SDK adapter, not the standalone demo. This local host
// implements only the documented message responses used by the native action.
// It is not evidence of a real Owlbear room test.
// Read-only inspection confirmed Owlbear and its official tracker both use
// color-scheme: normal, even with the dark UI. Reproduce that actual host.
for (const systemScheme of ["light", "dark"] as const) {
  test(`native action renders directly and preserves composited transparency (${systemScheme} preference)`, async ({
    page,
  }) => {
    page.on("pageerror", (error) =>
      console.log("Local SDK host error", error.message),
    );
    await page.setViewportSize({ width: 600, height: 480 });
    await page.emulateMedia({ colorScheme: systemScheme });
    const origin = "http://127.0.0.1:5173";
    const ref = encodeURIComponent(
      Buffer.from(`${origin} local-action-test`).toString("base64"),
    );
    await page.route("**/native-action-test", (route) =>
      route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><html style="color-scheme:normal"><meta charset="utf-8"><style>
        body { margin:0; background:#638896; color:white; font:14px sans-serif; }
        nav { height:40px; background:#292b39; }
        button { margin:4px 8px; font:20px sans-serif; }
        #paper { position:absolute; left:8px; top:48px; width:260px; border-radius:16px; overflow:hidden; background:rgba(30,34,49,.6); background-image:linear-gradient(#ffffff0d,#ffffff0d); }
        iframe { display:block; width:260px; height:96px; border:0; }
        #label { position:absolute; left:300px; top:90px; max-width:260px; }
        [hidden] { display:none !important; }
      </style><nav><button id="toggle" aria-label="战斗序列">⚔</button></nav>
      <section id="paper"><iframe title="战斗面板" src="/panel.html?obrref=${ref}"></iframe></section>
      <p id="label">原生动作面板模拟宿主<br>本地回归，非真实房间</p><output id="messages" hidden></output>
      <script>
        const paper=document.getElementById('paper');
        const frame=document.querySelector('iframe');
        const messages=[];
        const metadata={
          'io.combat-panel.v1/manual/manual-one':{name:'万众瞩目的超偶像',initiative:20.5,statuses:[]},
          'io.combat-panel.v1/manual/manual-two':{name:'巢穴动作',initiative:20,statuses:[]}
        };
        document.getElementById('toggle').onclick=()=>{paper.hidden=!paper.hidden;};
        frame.onload=()=>frame.contentWindow.postMessage({id:'OBR_READY',data:{ref:'local-action',userId:'test-gm'}},location.origin);
        window.addEventListener('message',event=>{
          if(event.origin!==location.origin || event.source!==frame.contentWindow) return;
          const {id,data,nonce}=event.data;
          messages.push(id);
          document.getElementById('messages').textContent=JSON.stringify(messages);
          let response;
          if(id==='OBR_ACTION_SET_WIDTH') {frame.style.width=data.width+'px';paper.style.width=data.width+'px';response={};}
          if(id==='OBR_ACTION_SET_HEIGHT') {frame.style.height=data.height+'px';response={};}
          if(id==='OBR_PLAYER_GET_ROLE') response={role:'GM'};
          if(id==='OBR_ROOM_GET_METADATA') response={metadata:{}};
          if(id==='OBR_SCENE_IS_READY') response={ready:true};
          if(id==='OBR_SCENE_ITEMS_GET_ALL_ITEMS') response={items:[]};
          if(id==='OBR_SCENE_GET_METADATA') response={metadata};
          if(response!==undefined && nonce) event.source.postMessage({id:id+'_RESPONSE'+nonce,data:response},event.origin);
        });
      </script>`,
      }),
    );
    await page.goto("/native-action-test");
    const frame = page.frameLocator("iframe");
    await expect(
      frame.getByLabel("万众瞩目的超偶像先攻", { exact: true }),
    ).toHaveValue("20.5");
    await expect(frame.getByLabel("巢穴动作先攻", { exact: true })).toHaveValue(
      "20",
    );
    await expect(
      frame.getByRole("button", { name: "关闭面板", exact: true }),
    ).toHaveCount(0);
    await expect(
      frame.getByRole("button", { name: "DM", exact: true }),
    ).toHaveCount(0);
    await expect(frame.getByRole("alert")).toHaveCount(0);
    const geometry = await frame.locator("main").evaluate((e) => ({
      top: e.getBoundingClientRect().top,
      headerTop: e.querySelector("header")!.getBoundingClientRect().top,
      width: e.getBoundingClientRect().width,
      background: getComputedStyle(e).backgroundColor,
    }));
    expect(geometry).toEqual({
      top: 0,
      headerTop: 0,
      width: 260,
      background: "rgba(0, 0, 0, 0)",
    });
    const size = await page.locator("iframe").boundingBox();
    expect(size!.height).toBeGreaterThanOrEqual(96);
    expect(size!.height).toBeLessThan(240);

    // A blank strip inside the iframe must change when the map behind it changes.
    // CSS assertions alone missed the browser's solid iframe canvas regression.
    const sample = () =>
      page.screenshot({ clip: { x: 108, y: 49, width: 8, height: 3 } });
    const before = await sample();
    await page.locator("body").evaluate((e) => {
      e.style.backgroundColor = "#cfb878";
    });
    const after = await sample();
    expect(after.equals(before)).toBe(false);

    await page.getByRole("button", { name: "战斗序列", exact: true }).click();
    await expect(page.locator("#paper")).toBeHidden();
    await page.getByRole("button", { name: "战斗序列", exact: true }).click();
    await expect(
      frame.getByLabel("万众瞩目的超偶像先攻", { exact: true }),
    ).toHaveValue("20.5");
    await expect(frame.getByRole("alert")).toHaveCount(0);
    const calls = JSON.parse(
      (await page.locator("#messages").textContent()) || "[]",
    ) as string[];
    expect(calls).toContain("OBR_ACTION_SET_HEIGHT");
    expect(
      calls.some(
        (id) => id.startsWith("OBR_POPOVER_") || id === "OBR_ACTION_CLOSE",
      ),
    ).toBe(false);
    await page.screenshot({
      path: `qa/v052-native-action-${systemScheme}.png`,
    });

    await frame.getByRole("button", { name: "效果管理", exact: true }).click();
    await frame.getByRole("button", { name: "新建效果" }).click();
    await expect(page.locator("iframe")).toHaveCSS("height", "420px");
    await frame.getByRole("button", { name: "取消", exact: true }).click();
  });
}
