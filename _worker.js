
// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'auto';
let mypassword = ''; // 管理页面登录密码，为空则使用 TOKEN
let guestToken = ''; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'SerokVip';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31

//节点链接 + 订阅链接
let MainData = `
https://cfxr.eu.org/getSub
`;

let urls = [];
let clashConverterUrl = ""; // clash-sub-converter 部署地址

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		mypassword = env.PASSWORD || mypassword; // 管理页面登录密码
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		clashConverterUrl = env.CLASH_URL || clashConverterUrl;
		// 移除 clashConverterUrl 末尾的斜杠
		if (clashConverterUrl.endsWith('/')) {
			clashConverterUrl = clashConverterUrl.slice(0, -1);
		}
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		guestToken = env.GUESTTOKEN || env.GUEST || guestToken;
		if (!guestToken) guestToken = await MD5MD5(mytoken);
		const 访客订阅 = guestToken;
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
		total = total * 1099511627776;
		let expire = Math.floor(timestamp / 1000);
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

		// 管理页面入口: /admin 或 /?admin
		const isAdminPath = url.pathname === '/admin' || url.searchParams.has('admin');
		if (isAdminPath) {
			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				await sendMessage(`#访问管理页 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
				return await KV(request, env, 'LINK.txt', 访客订阅, mypassword);
			} else {
				return new Response('请先绑定 KV 命名空间', { status: 400 });
			}
		}

		if (!([mytoken, fakeToken, 访客订阅].includes(token) || url.pathname.startsWith("/" + mytoken))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} else {
			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				MainData = await env.KV.get('LINK.txt') || MainData;
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
			let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));

			// 收集 https 订阅链接
			let 订阅链接数组 = [];
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					订阅链接数组.push(x);
				}
			}

			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);

			// 预先获取所有订阅内容，建立 URL -> 节点列表 的映射
			订阅链接数组 = [...new Set(订阅链接数组)].filter(item => item?.trim?.());
			const 订阅内容映射 = await getSUBWithMapping(订阅链接数组, request, userAgentHeader);

			// 只保留 base64 和 clash 两种格式
			let 订阅格式 = 'base64';
			if (userAgent.includes('clash') || userAgent.includes('meta') || userAgent.includes('mihomo') || url.searchParams.has('clash')) {
				订阅格式 = 'clash';
			}
			if (url.searchParams.has('b64') || url.searchParams.has('base64')) {
				订阅格式 = 'base64';
			}

			// 按原始顺序处理所有链接
			let req_data = "";
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					// 获取该 URL 对应的节点列表
					const nodes = 订阅内容映射[x];
					if (nodes && nodes.length > 0) {
						req_data += nodes.join('\n') + '\n';
					}
				} else if (x.trim()) {
					// 直接节点
					req_data += x + '\n';
				}
			}

			//修复中文错误
			const utf8Encoder = new TextEncoder();
			const encodedData = utf8Encoder.encode(req_data);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重
			const uniqueLines = new Set(text.split('\n'));
			const result = [...uniqueLines].filter(line => line.trim()).join('\n');
			//console.log(result);

			let base64Data;
			try {
				base64Data = btoa(result);
			} catch (e) {
				function encodeBase64(data) {
					const binary = new TextEncoder().encode(data);
					let base64 = '';
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

					for (let i = 0; i < binary.length; i += 3) {
						const byte1 = binary[i];
						const byte2 = binary[i + 1] || 0;
						const byte3 = binary[i + 2] || 0;

						base64 += chars[byte1 >> 2];
						base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
						base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
						base64 += chars[byte3 & 63];
					}

					const padding = 3 - (binary.length % 3 || 3);
					return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
				}

				base64Data = encodeBase64(result)
			}

			// 构建响应头对象
			const responseHeaders = {
				"content-type": "text/plain; charset=utf-8",
				"Profile-Update-Interval": `${SUBUpdateTime}`,
				"Profile-web-page-url": request.url.includes('?') ? request.url.split('?')[0] : request.url,
				//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
			};

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, { headers: responseHeaders });
			} else if (订阅格式 == 'clash') {
				// 使用 clash-sub-converter 进行转换
				if (!clashConverterUrl) {
					// 如果没有配置转换器地址，返回 base64 格式
					console.log('未配置 CLASH_CONVERTER_URL，返回 base64 格式');
					return new Response(base64Data, { headers: responseHeaders });
				}

				// 使用回调 URL 方式：转换器会回调到本脚本获取 base64 内容
				const callbackUrl = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
				const converterApiUrl = `${clashConverterUrl}/sub?url=${encodeURIComponent(callbackUrl)}&target=clash.meta&emoji=true`;

				try {
					const converterResponse = await fetch(converterApiUrl, {
						headers: { 'User-Agent': userAgentHeader || 'ClashSubConverter/1.0' }
					});
					if (!converterResponse.ok) {
						console.log('Clash 转换失败，返回 base64 格式');
						return new Response(base64Data, { headers: responseHeaders });
					}
					let clashContent = await converterResponse.text();
					clashContent = await clashFix(clashContent);
					// 只有非浏览器订阅才会返回SUBNAME
					if (!userAgent.includes('mozilla')) responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`;
					return new Response(clashContent, { headers: responseHeaders });
				} catch (error) {
					console.log('Clash 转换异常，返回 base64 格式:', error);
					return new Response(base64Data, { headers: responseHeaders });
				}
			}
		}
	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[\t"'|\r\n]+/g, '\n').replace(/\n+/g, '\n');	// 替换为换行
	//console.log(addtext);
	if (addtext.charAt(0) == '\n') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == '\n') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split('\n');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
	body {
		width: 35em;
		margin: 0 auto;
		font-family: Tahoma, Verdana, Arial, sans-serif;
	}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
}

async function MD5MD5(text) {
	const encoder = new TextEncoder();

	const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
	const firstPassArray = Array.from(new Uint8Array(firstPass));
	const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
	const secondPassArray = Array.from(new Uint8Array(secondPass));
	const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return secondHex.toLowerCase();
}

function clashFix(content) {
	if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

/**
 * 获取订阅内容，将所有 https 订阅解析为节点 URI 列表
 */
async function getSUB(api, request, userAgentHeader) {
	if (!api || api.length === 0) {
		return [];
	} else api = [...new Set(api)]; // 去重

	let allNodes = [];
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 3秒后取消所有请求
	}, 3000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		for (let i = 0; i < responses.length; i++) {
			const response = responses[i];
			const apiUrl = api[i];

			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					console.log(`请求超时: ${apiUrl}`);
				} else {
					console.error(`请求失败: ${apiUrl}, 错误信息: ${reason?.status} ${reason?.statusText}`);
				}
				continue;
			}

			const content = response.value || '';
			if (!content.trim()) continue;

			// 解析订阅内容
			const nodes = parseSubscriptionContent(content, apiUrl);
			allNodes = allNodes.concat(nodes);
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	return allNodes;
}

/**
 * 获取订阅内容，返回 URL -> 节点列表 的映射，用于保持原始顺序
 */
async function getSUBWithMapping(api, request, userAgentHeader) {
	const result = {};
	if (!api || api.length === 0) {
		return result;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, 3000);

	try {
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		for (let i = 0; i < responses.length; i++) {
			const response = responses[i];
			const apiUrl = api[i];

			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					console.log(`请求超时: ${apiUrl}`);
				} else {
					console.error(`请求失败: ${apiUrl}, 错误信息: ${reason?.status} ${reason?.statusText}`);
				}
				result[apiUrl] = [];
				continue;
			}

			const content = response.value || '';
			if (!content.trim()) {
				result[apiUrl] = [];
				continue;
			}

			const nodes = parseSubscriptionContent(content, apiUrl);
			result[apiUrl] = nodes;
		}
	} catch (error) {
		console.error(error);
	} finally {
		clearTimeout(timeout);
	}

	return result;
}

/**
 * 解析订阅内容，返回节点 URI 列表
 */
function parseSubscriptionContent(content, sourceUrl) {
	const trimmed = content.trim();

	// 1. 检查是否为 Clash YAML 格式
	if (trimmed.startsWith('proxies:') || trimmed.includes('\nproxies:')) {
		console.log('Clash订阅: ' + sourceUrl);
		return parseClashYaml(content);
	}

	// 2. 检查是否为 Singbox JSON 格式
	if (trimmed.includes('outbounds"') && trimmed.includes('inbounds"')) {
		console.log('Singbox订阅: ' + sourceUrl);
		return parseSingboxJson(content);
	}

	// 3. 检查是否为明文 URI 列表
	if (trimmed.includes('://')) {
		console.log('明文订阅: ' + sourceUrl);
		return trimmed.split('\n').filter(line => line.trim() && line.includes('://'));
	}

	// 4. 尝试 Base64 解码
	if (isValidBase64(trimmed)) {
		try {
			const decoded = base64Decode(trimmed);
			if (decoded.includes('://')) {
				console.log('Base64订阅: ' + sourceUrl);
				return decoded.split('\n').filter(line => line.trim() && line.includes('://'));
			}
		} catch (e) {
			console.log('Base64解码失败: ' + sourceUrl);
		}
	}

	// 无法识别的格式
	console.log('异常订阅: ' + sourceUrl);
	const 异常节点 = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${sourceUrl.split('://')[1]?.split('/')[0] || 'unknown'}`;
	return [异常节点];
}

/**
 * 解析 Clash YAML 格式，将 proxies 转换为节点 URI 列表
 */
function parseClashYaml(content) {
	const nodes = [];

	try {
		// 提取 proxies 部分
		const match = content.match(/proxies:\s*\n([\s\S]+?)(?:\nproxy-groups:|\nrules:|\nrule-providers:|$)/);
		if (!match) return nodes;

		const proxiesSection = match[1];
		// 匹配每个 proxy 对象（支持花括号格式和缩进格式）
		const proxyMatches = proxiesSection.matchAll(/^\s*-\s*\{([^}]+)\}/gm);

		for (const m of proxyMatches) {
			try {
				const proxyStr = `{${m[1]}}`;
				const proxy = parseYamlProxy(proxyStr);
				if (proxy) {
					const uri = proxyToUri(proxy);
					if (uri) nodes.push(uri);
				}
			} catch (e) {
				console.log('解析 proxy 失败:', e);
			}
		}
	} catch (e) {
		console.log('解析 Clash YAML 失败:', e);
	}

	return nodes;
}

/**
 * 解析 YAML 格式的单个 proxy 对象
 */
function parseYamlProxy(str) {
	const obj = {};
	// 移除首尾的花括号
	const content = str.slice(1, -1);
	// 用正则匹配 key: value 对，支持嵌套对象
	const pairs = [];
	let current = '';
	let braceDepth = 0;

	for (let i = 0; i < content.length; i++) {
		const char = content[i];
		if (char === '{') braceDepth++;
		else if (char === '}') braceDepth--;

		if (char === ',' && braceDepth === 0) {
			pairs.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim()) pairs.push(current.trim());

	for (const pair of pairs) {
		const colonIndex = pair.indexOf(':');
		if (colonIndex === -1) continue;
		const key = pair.substring(0, colonIndex).trim();
		let value = pair.substring(colonIndex + 1).trim();
		// 移除引号
		value = value.replace(/^["']|["']$/g, '');
		obj[key] = value;
	}

	return obj.name ? obj : null;
}

/**
 * 将 Clash proxy 对象转换为节点 URI
 */
function proxyToUri(proxy) {
	const type = proxy.type?.toLowerCase();
	const name = encodeURIComponent(proxy.name || 'Unnamed');

	try {
		switch (type) {
			case 'vmess':
				return vmessToUri(proxy);
			case 'vless':
				return vlessToUri(proxy);
			case 'trojan':
				return trojanToUri(proxy);
			case 'ss':
				return ssToUri(proxy);
			case 'hysteria2':
			case 'hy2':
				return hysteria2ToUri(proxy);
			case 'tuic':
				return tuicToUri(proxy);
			default:
				console.log(`不支持的节点类型: ${type}`);
				return null;
		}
	} catch (e) {
		console.log(`转换节点失败: ${proxy.name}`, e);
		return null;
	}
}

function vmessToUri(proxy) {
	const config = {
		v: "2",
		ps: proxy.name || 'VMess',
		add: proxy.server,
		port: proxy.port,
		id: proxy.uuid,
		aid: proxy.alterId || 0,
		scy: proxy.cipher || 'auto',
		net: proxy.network || 'tcp',
		type: 'none',
		host: '',
		path: '',
		tls: proxy.tls ? 'tls' : '',
		sni: proxy.servername || proxy.sni || ''
	};

	// 处理 ws-opts
	if (proxy['ws-opts']) {
		config.path = proxy['ws-opts'].path || '/';
		if (proxy['ws-opts'].headers) {
			config.host = proxy['ws-opts'].headers.Host || proxy['ws-opts'].headers.host || '';
		}
	}

	// 处理 grpc-opts
	if (proxy['grpc-opts']) {
		config.path = proxy['grpc-opts']['grpc-service-name'] || '';
	}

	return 'vmess://' + btoa(JSON.stringify(config));
}

function vlessToUri(proxy) {
	const params = new URLSearchParams();
	params.set('encryption', 'none');

	if (proxy.tls) {
		params.set('security', proxy['reality-opts'] ? 'reality' : 'tls');
		if (proxy.servername || proxy.sni) {
			params.set('sni', proxy.servername || proxy.sni);
		}
		if (proxy['reality-opts']) {
			if (proxy['reality-opts']['public-key']) {
				params.set('pbk', proxy['reality-opts']['public-key']);
			}
			if (proxy['reality-opts']['short-id']) {
				params.set('sid', proxy['reality-opts']['short-id']);
			}
		}
	}

	// 添加 flow 参数
	if (proxy.flow) {
		params.set('flow', proxy.flow);
	}

	// 添加 client-fingerprint -> fp 参数
	if (proxy['client-fingerprint']) {
		params.set('fp', proxy['client-fingerprint']);
	}

	params.set('type', proxy.network || 'tcp');

	if (proxy['ws-opts']) {
		if (proxy['ws-opts'].path) {
			params.set('path', proxy['ws-opts'].path);
		}
		if (proxy['ws-opts'].headers?.Host || proxy['ws-opts'].headers?.host) {
			params.set('host', proxy['ws-opts'].headers.Host || proxy['ws-opts'].headers.host);
		}
	}

	if (proxy['grpc-opts']) {
		params.set('serviceName', proxy['grpc-opts']['grpc-service-name'] || '');
	}

	const name = encodeURIComponent(proxy.name || 'VLESS');
	return `vless://${proxy.uuid}@${proxy.server}:${proxy.port}?${params.toString()}#${name}`;
}

function trojanToUri(proxy) {
	const params = new URLSearchParams();
	params.set('security', 'tls');

	if (proxy.sni || proxy.servername) {
		params.set('sni', proxy.sni || proxy.servername);
	}

	params.set('type', proxy.network || 'tcp');

	if (proxy['ws-opts']) {
		if (proxy['ws-opts'].path) {
			params.set('path', proxy['ws-opts'].path);
		}
		if (proxy['ws-opts'].headers?.Host || proxy['ws-opts'].headers?.host) {
			params.set('host', proxy['ws-opts'].headers.Host || proxy['ws-opts'].headers.host);
		}
	}

	const name = encodeURIComponent(proxy.name || 'Trojan');
	return `trojan://${proxy.password}@${proxy.server}:${proxy.port}?${params.toString()}#${name}`;
}

function ssToUri(proxy) {
	const method = proxy.cipher;
	const password = proxy.password;
	const server = proxy.server;
	const port = proxy.port;
	const name = encodeURIComponent(proxy.name || 'Shadowsocks');

	// 编码 method:password
	const auth = btoa(`${method}:${password}`);

	let uri = `ss://${auth}@${server}:${port}`;

	// 处理插件
	if (proxy.plugin) {
		const pluginParts = [proxy.plugin];
		if (proxy['plugin-opts']) {
			for (const [key, value] of Object.entries(proxy['plugin-opts'])) {
				if (value === true) {
					pluginParts.push(key);
				} else if (value !== false && value !== undefined) {
					pluginParts.push(`${key}=${value}`);
				}
			}
		}
		uri += `?plugin=${encodeURIComponent(pluginParts.join(';'))}`;
	}

	return `${uri}#${name}`;
}

function hysteria2ToUri(proxy) {
	const params = new URLSearchParams();
	if (proxy.sni || proxy.servername) {
		params.set('sni', proxy.sni || proxy.servername);
	}

	const name = encodeURIComponent(proxy.name || 'Hysteria2');
	return `hysteria2://${proxy.password}@${proxy.server}:${proxy.port}?${params.toString()}#${name}`;
}

function tuicToUri(proxy) {
	const params = new URLSearchParams();
	if (proxy.sni || proxy.servername) {
		params.set('sni', proxy.sni || proxy.servername);
	}
	if (proxy['congestion-controller']) {
		params.set('congestion_control', proxy['congestion-controller']);
	}

	const name = encodeURIComponent(proxy.name || 'TUIC');
	const auth = proxy.password ? `${proxy.uuid}:${proxy.password}` : proxy.uuid;
	return `tuic://${auth}@${proxy.server}:${proxy.port}?${params.toString()}#${name}`;
}

/**
 * 解析 Singbox JSON 格式（简化版，只提取基本节点信息）
 */
function parseSingboxJson(content) {
	const nodes = [];

	try {
		const config = JSON.parse(content);
		const outbounds = config.outbounds || [];

		for (const outbound of outbounds) {
			// 跳过特殊类型
			if (['direct', 'block', 'dns', 'selector', 'urltest'].includes(outbound.type)) {
				continue;
			}

			const uri = singboxOutboundToUri(outbound);
			if (uri) nodes.push(uri);
		}
	} catch (e) {
		console.log('解析 Singbox JSON 失败:', e);
	}

	return nodes;
}

function singboxOutboundToUri(outbound) {
	const type = outbound.type;
	const tag = outbound.tag || 'Unnamed';

	try {
		switch (type) {
			case 'vmess': {
				const config = {
					v: "2",
					ps: tag,
					add: outbound.server,
					port: outbound.server_port,
					id: outbound.uuid,
					aid: outbound.alter_id || 0,
					scy: outbound.security || 'auto',
					net: outbound.transport?.type || 'tcp',
					type: 'none',
					host: outbound.transport?.headers?.Host || '',
					path: outbound.transport?.path || '',
					tls: outbound.tls?.enabled ? 'tls' : '',
					sni: outbound.tls?.server_name || ''
				};
				return 'vmess://' + btoa(JSON.stringify(config));
			}
			case 'vless': {
				const params = new URLSearchParams();
				params.set('encryption', 'none');
				if (outbound.tls?.enabled) {
					params.set('security', outbound.tls?.reality?.enabled ? 'reality' : 'tls');
					if (outbound.tls?.server_name) params.set('sni', outbound.tls.server_name);
				}
				params.set('type', outbound.transport?.type || 'tcp');
				if (outbound.transport?.path) params.set('path', outbound.transport.path);
				if (outbound.transport?.headers?.Host) params.set('host', outbound.transport.headers.Host);
				return `vless://${outbound.uuid}@${outbound.server}:${outbound.server_port}?${params.toString()}#${encodeURIComponent(tag)}`;
			}
			case 'trojan': {
				const params = new URLSearchParams();
				params.set('security', 'tls');
				if (outbound.tls?.server_name) params.set('sni', outbound.tls.server_name);
				params.set('type', outbound.transport?.type || 'tcp');
				return `trojan://${outbound.password}@${outbound.server}:${outbound.server_port}?${params.toString()}#${encodeURIComponent(tag)}`;
			}
			case 'shadowsocks': {
				const auth = btoa(`${outbound.method}:${outbound.password}`);
				return `ss://${auth}@${outbound.server}:${outbound.server_port}#${encodeURIComponent(tag)}`;
			}
			case 'hysteria2': {
				const params = new URLSearchParams();
				if (outbound.tls?.server_name) params.set('sni', outbound.tls.server_name);
				return `hysteria2://${outbound.password}@${outbound.server}:${outbound.server_port}?${params.toString()}#${encodeURIComponent(tag)}`;
			}
			default:
				return null;
		}
	} catch (e) {
		return null;
	}
}

async function getUrl(request, targetUrl, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} SerokVip (${userAgentHeader})`);

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow",
		cf: {
			// 忽略SSL证书验证
			insecureSkipVerify: true,
			// 允许自签名证书
			allowUntrusted: true,
			// 禁用证书验证
			validateCertificate: false
		}
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function isValidBase64(str) {
	// 先移除所有空白字符(空格、换行、回车等)
	const cleanStr = str.replace(/\s/g, '');
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(cleanStr);
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

async function KV(request, env, txt = 'ADD.txt', guest, password) {
	const url = new URL(request.url);
	const loginPassword = password; // 管理页面登录密码
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				const content = await request.text();
				await env.KV.put(txt, content);
				return new Response("保存成功");
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 订阅管理</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
					:root {
						--bg-primary: #0d1117;
						--bg-secondary: #161b22;
						--bg-tertiary: #21262d;
						--border-color: #30363d;
						--text-primary: #e6edf3;
						--text-secondary: #8b949e;
						--accent-color: #58a6ff;
						--accent-hover: #79c0ff;
						--success-color: #3fb950;
						--success-hover: #2ea043;
						--danger-color: #f85149;
						--warning-color: #d29922;
					}
					* {
						box-sizing: border-box;
						margin: 0;
						padding: 0;
					}
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
						background: var(--bg-primary);
						color: var(--text-primary);
						font-size: 14px;
						line-height: 1.5;
						min-height: 100vh;
					}
					/* 登录页面 */
					.login-container {
						display: flex;
						justify-content: center;
						align-items: center;
						min-height: 100vh;
						padding: 20px;
					}
					.login-box {
						background: var(--bg-secondary);
						border: 1px solid var(--border-color);
						border-radius: 12px;
						padding: 32px;
						width: 100%;
						max-width: 360px;
						box-shadow: 0 8px 24px rgba(0,0,0,0.4);
					}
					.login-title {
						text-align: center;
						font-size: 24px;
						font-weight: 600;
						margin-bottom: 24px;
						color: var(--text-primary);
					}
					.login-input {
						width: 100%;
						padding: 12px 16px;
						background: var(--bg-tertiary);
						border: 1px solid var(--border-color);
						border-radius: 8px;
						color: var(--text-primary);
						font-size: 14px;
						margin-bottom: 16px;
						transition: border-color 0.2s;
					}
					.login-input:focus {
						outline: none;
						border-color: var(--accent-color);
					}
					.login-btn {
						width: 100%;
						padding: 12px;
						background: var(--success-color);
						border: none;
						border-radius: 8px;
						color: #fff;
						font-size: 14px;
						font-weight: 600;
						cursor: pointer;
						transition: background 0.2s;
					}
					.login-btn:hover {
						background: var(--success-hover);
					}
					.login-error {
						color: var(--danger-color);
						font-size: 13px;
						text-align: center;
						margin-top: 12px;
						display: none;
					}
					/* 主页面 */
					.main-container {
						display: none;
						max-width: 1200px;
						margin: 0 auto;
						padding: 24px;
					}
					.header {
						display: flex;
						justify-content: space-between;
						align-items: center;
						margin-bottom: 24px;
						padding-bottom: 16px;
						border-bottom: 1px solid var(--border-color);
					}
					.header h1 {
						font-size: 20px;
						font-weight: 600;
					}
					.logout-btn {
						padding: 6px 12px;
						background: var(--bg-tertiary);
						border: 1px solid var(--border-color);
						border-radius: 6px;
						color: var(--text-secondary);
						font-size: 13px;
						cursor: pointer;
						transition: all 0.2s;
					}
					.logout-btn:hover {
						color: var(--danger-color);
						border-color: var(--danger-color);
					}
					.section {
						background: var(--bg-secondary);
						border: 1px solid var(--border-color);
						border-radius: 8px;
						margin-bottom: 16px;
						overflow: hidden;
					}
					.section-title {
						padding: 12px 16px;
						background: var(--bg-tertiary);
						font-weight: 600;
						font-size: 14px;
						border-bottom: 1px solid var(--border-color);
						display: flex;
						justify-content: space-between;
						align-items: center;
						cursor: pointer;
					}
					.section-title:hover {
						background: #282e36;
					}
					.section-content {
						padding: 16px;
					}
					.sub-item {
						display: flex;
						align-items: center;
						justify-content: space-between;
						padding: 10px 0;
						border-bottom: 1px solid var(--border-color);
					}
					.sub-item:last-child {
						border-bottom: none;
					}
					.sub-label {
						color: var(--text-secondary);
						font-size: 13px;
						min-width: 100px;
					}
					.sub-link {
						flex: 1;
						color: var(--accent-color);
						text-decoration: none;
						font-size: 13px;
						word-break: break-all;
						cursor: pointer;
					}
					.sub-link:hover {
						color: var(--accent-hover);
					}
					.copy-btn {
						padding: 4px 10px;
						margin-left: 8px;
						background: var(--bg-tertiary);
						border: 1px solid var(--border-color);
						border-radius: 4px;
						color: var(--text-secondary);
						font-size: 12px;
						cursor: pointer;
						transition: all 0.2s;
					}
					.copy-btn:hover {
						border-color: var(--accent-color);
						color: var(--accent-color);
					}
					.editor {
						width: 100%;
						min-height: 280px;
						padding: 12px;
						background: var(--bg-tertiary);
						border: 1px solid var(--border-color);
						border-radius: 6px;
						color: var(--text-primary);
						font-family: 'SF Mono', Monaco, Consolas, monospace;
						font-size: 13px;
						line-height: 1.6;
						resize: vertical;
					}
					.editor:focus {
						outline: none;
						border-color: var(--accent-color);
					}
					.save-container {
						margin-top: 12px;
						display: flex;
						align-items: center;
						gap: 12px;
					}
					.save-btn {
						padding: 8px 20px;
						background: var(--success-color);
						border: none;
						border-radius: 6px;
						color: #fff;
						font-size: 14px;
						font-weight: 500;
						cursor: pointer;
						transition: background 0.2s;
					}
					.save-btn:hover {
						background: var(--success-hover);
					}
					.save-btn:disabled {
						opacity: 0.6;
						cursor: not-allowed;
					}
					.save-status {
						color: var(--text-secondary);
						font-size: 13px;
					}
					.info-item {
						display: flex;
						padding: 8px 0;
						font-size: 13px;
					}
					.info-label {
						color: var(--text-secondary);
						min-width: 160px;
					}
					.info-value {
						color: var(--text-primary);
						word-break: break-all;
					}
					.collapse-icon {
						transition: transform 0.2s;
					}
					.collapsed .collapse-icon {
						transform: rotate(-90deg);
					}
					.collapsed + .section-content {
						display: none;
					}
					</style>
				</head>
				<body>
					<!-- 登录页面 -->
					<div class="login-container" id="loginPage">
						<div class="login-box">
							<div class="login-title">🔐 ${FileName}</div>
							<input type="password" class="login-input" id="passwordInput" placeholder="输入访问密码" autocomplete="off">
							<button class="login-btn" onclick="doLogin()">登 录</button>
							<div class="login-error" id="loginError">密码错误，请重试</div>
						</div>
					</div>
					
					<!-- 主页面 -->
					<div class="main-container" id="mainPage">
						<div class="header">
							<h1>📡 ${FileName} 订阅管理</h1>
							<button class="logout-btn" onclick="doLogout()">退出登录</button>
						</div>
						
						<!-- 订阅地址 -->
						<div class="section">
							<div class="section-title collapsed" onclick="toggleSection(this)">
								<span>📋 订阅地址</span>
								<span class="collapse-icon">▼</span>
							</div>
							<div class="section-content" style="display:none;">
								<div class="sub-item">
									<span class="sub-label">自适应:</span>
									<span class="sub-link" onclick="copyText('https://${url.hostname}/${mytoken}')">https://${url.hostname}/${mytoken}</span>
									<button class="copy-btn" onclick="copyText('https://${url.hostname}/${mytoken}')">复制</button>
								</div>
								<div class="sub-item">
									<span class="sub-label">Base64:</span>
									<span class="sub-link" onclick="copyText('https://${url.hostname}/${mytoken}?b64')">https://${url.hostname}/${mytoken}?b64</span>
									<button class="copy-btn" onclick="copyText('https://${url.hostname}/${mytoken}?b64')">复制</button>
								</div>
								<div class="sub-item">
									<span class="sub-label">Clash:</span>
									<span class="sub-link" onclick="copyText('https://${url.hostname}/${mytoken}?clash')">https://${url.hostname}/${mytoken}?clash</span>
									<button class="copy-btn" onclick="copyText('https://${url.hostname}/${mytoken}?clash')">复制</button>
								</div>
							</div>
						</div>
						
						<!-- 访客订阅 -->
						<div class="section">
							<div class="section-title collapsed" onclick="toggleSection(this)">
								<span>👥 访客订阅 (Token: ${guest})</span>
								<span class="collapse-icon">▼</span>
							</div>
							<div class="section-content" style="display:none;">
								<div class="sub-item">
									<span class="sub-label">自适应:</span>
									<span class="sub-link" onclick="copyText('https://${url.hostname}/sub?token=${guest}')">https://${url.hostname}/sub?token=${guest}</span>
									<button class="copy-btn" onclick="copyText('https://${url.hostname}/sub?token=${guest}')">复制</button>
								</div>
								<div class="sub-item">
									<span class="sub-label">Base64:</span>
									<span class="sub-link" onclick="copyText('https://${url.hostname}/sub?token=${guest}&b64')">https://${url.hostname}/sub?token=${guest}&b64</span>
									<button class="copy-btn" onclick="copyText('https://${url.hostname}/sub?token=${guest}&b64')">复制</button>
								</div>
								<div class="sub-item">
									<span class="sub-label">Clash:</span>
									<span class="sub-link" onclick="copyText('https://${url.hostname}/sub?token=${guest}&clash')">https://${url.hostname}/sub?token=${guest}&clash</span>
									<button class="copy-btn" onclick="copyText('https://${url.hostname}/sub?token=${guest}&clash')">复制</button>
								</div>
							</div>
						</div>
						
						<!-- 配置信息 -->
						<div class="section">
							<div class="section-title collapsed" onclick="toggleSection(this)">
								<span>⚙️ 配置信息</span>
								<span class="collapse-icon">▼</span>
							</div>
							<div class="section-content" style="display:none;">
								<div class="info-item">
									<span class="info-label">Clash 转换后端:</span>
									<span class="info-value">${clashConverterUrl || '未配置'}</span>
								</div>
								<div class="info-item">
									<span class="info-label">User-Agent:</span>
									<span class="info-value">${request.headers.get('User-Agent')}</span>
								</div>
							</div>
						</div>
						
						<!-- 订阅编辑 -->
						<div class="section">
							<div class="section-title collapsed" onclick="toggleSection(this)">
								<span>✏️ 节点编辑</span>
								<span class="collapse-icon">▼</span>
							</div>
							<div class="section-content" style="display:none;">
								${hasKV ? `
								<textarea class="editor" id="content" placeholder="输入节点链接或订阅地址，每行一个...">${content}</textarea>
								<div class="save-container">
									<button class="save-btn" id="saveBtn" onclick="saveContent()">保存</button>
									<span class="save-status" id="saveStatus"></span>
								</div>
								` : '<p style="color:var(--warning-color);">请绑定变量名称为 KV 的 KV 命名空间</p>'}
							</div>
						</div>
					</div>
					
					<script>
					const CORRECT_TOKEN = '${loginPassword}';
					
					// 检查登录状态
					function checkLogin() {
						const saved = sessionStorage.getItem('auth_token');
						if (saved === CORRECT_TOKEN) {
							showMainPage();
						}
					}
					
					// 登录
					function doLogin() {
						const input = document.getElementById('passwordInput').value;
						if (input === CORRECT_TOKEN) {
							sessionStorage.setItem('auth_token', input);
							showMainPage();
						} else {
							document.getElementById('loginError').style.display = 'block';
							document.getElementById('passwordInput').value = '';
						}
					}
					
					// 退出登录
					function doLogout() {
						sessionStorage.removeItem('auth_token');
						document.getElementById('loginPage').style.display = 'flex';
						document.getElementById('mainPage').style.display = 'none';
					}
					
					// 显示主页面
					function showMainPage() {
						document.getElementById('loginPage').style.display = 'none';
						document.getElementById('mainPage').style.display = 'block';
					}
					
					// 切换展开/折叠
					function toggleSection(titleEl) {
						titleEl.classList.toggle('collapsed');
						const content = titleEl.nextElementSibling;
						content.style.display = content.style.display === 'none' ? 'block' : 'none';
					}
					
					// 复制文本
					function copyText(text) {
						navigator.clipboard.writeText(text).then(() => {
							showToast('已复制到剪贴板');
						});
					}
					
					
					// 保存内容
					function saveContent() {
						const btn = document.getElementById('saveBtn');
						const status = document.getElementById('saveStatus');
						const textarea = document.getElementById('content');
						
						btn.disabled = true;
						btn.textContent = '保存中...';
						
						fetch(window.location.href, {
							method: 'POST',
							body: textarea.value,
							headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
						})
						.then(res => {
							if (!res.ok) throw new Error('保存失败');
							status.textContent = '已保存 ' + new Date().toLocaleTimeString();
							status.style.color = 'var(--success-color)';
						})
						.catch(err => {
							status.textContent = '保存失败: ' + err.message;
							status.style.color = 'var(--danger-color)';
						})
						.finally(() => {
							btn.disabled = false;
							btn.textContent = '保存';
						});
					}
					
					// Toast 提示
					function showToast(msg) {
						const toast = document.createElement('div');
						toast.textContent = msg;
						toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--bg-tertiary);color:var(--text-primary);padding:10px 20px;border-radius:8px;border:1px solid var(--border-color);z-index:9999;';
						document.body.appendChild(toast);
						setTimeout(() => toast.remove(), 2000);
					}
					
					// 回车登录
					document.getElementById('passwordInput').addEventListener('keypress', (e) => {
						if (e.key === 'Enter') doLogin();
					});
					
					// 初始化
					checkLogin();
					</script>
				</body>
			</html>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}
