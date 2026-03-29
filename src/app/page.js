'use client';

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ALPHA_CONTRACT_ADDRESS,
  ALPHA_FUNCTION_SELECTORS,
  BSC_CHAIN_NAME,
  BSC_WALLET_NETWORK,
} from '../config/bsc-network';

export default function Home() {
  const words = [
    "M", "ICNT", "CROSS", "AIN", "PAL", "BGSC", "FUEL", "ECHO", "NODE", "BOOM",
    "MPLX", "TALE", "OIK", "TANSSI", "RCADE", "VELVET", "C", "PEAQ", "SPA", "RION",
    "TAC", "TAKER", "BAS", "ESPORTS", "ERA", "TA", "G", "ZKWASM", "UPTOP", "COA",
    "YALA", "LN", "PHY", "ASP", "DELABS", "VAR", "PLAY", "RHEA", "TREE", "GAIA",
    "AIO", "NAORIS", "MIA", "MM", "TOSHI", "CYC", "FIR", "SUP", "IN",
    "TOWNS", "X", "PROVE", "SLAY", "BSU", "K", "XCX", "GAME", "WAI", "SLAY",
    "OVL", "BTR", "PUBLIC", "TCOM", "REVA", "AIBOT", "PUBLIC", "DAM", "RICE", "MLK",
    "WILD", "DGC", "XPIN", "AKE", "ARIA", "SAPIEN", "FST", "HEMI", "MTP", "DORA",
    "TOWN", "TAKE", "DOLO", "CELB", "XLAB", "MITO", "BLUM", "XLAB", "ZENT", "PTB",
    "Q", "FOREST", "WOD", "HOLO", "PTB", "MCH", "BOT", "SOMI", "TRADOOR", "GATA",
    "U", "SHARDS", "BOOST", "STAR", "SAROS", "OPEN", "MIRROR", "REKT", "MORE", "CESS",
    "XO", "SAHARA", "H", "NEWT", "DMC", "MGO", "CARV", "BULLA", "BRIC", "LOT",
    "AVAIL", "MAT", "BEE", "SPK", "BOMB", "ULTI", "VELO", "F", "DEGEN", "ROAM",
    "SGC", "PUNDIAI", "IDOL", "HOME", "RESOLV", "SKATE", "OL", "AB", "FLY", "CUDIS",
    "LA", "ZRC", "BDXN", "EDGEN", "SQD", "TAIKO", "ASRR", "RDO", "SOPH", "PFVS",
    "ELDE", "HUMA", "OBT", "SOON", "RWA", "TGT", "MERL", "XTER", "REX", "AGT",
    "NXPC", "PRAI", "RDAC", "PUFFER", "DOOD", "OBOL", "ZKJ", "MYX", "BOOP", "B2",
    "HAEDAL", "MILK", "SIGN", "AIOT", "SWTCH", "POP", "AVNT", "LINEA", "PINGPONG", "UB",
    "AA", "ZEUS", "ALEO", "ZKC", "VLR", "STBL", "MAIGA", "AIA", "BARD", "RIVER",
    "JOJO", "DL", "AOP", "FROGGIE", "NUMI", "0G", "BLESS", "ZBT", "GAIN", "COAI",
    "XPL", "MIRA", "HANA", "GOATED", "LIGHT", "SERAPH", "XAN", "FF", "EDEN", "VFY",
    "STRIKE", "TRUTH", "2Z", "BTG", "EVAA", "P", "CYPR", "LYN", "KLINK", "KGEN",
    "SLX", "PIPE", "WAL", "EUL", "CDL", "CORL", "YB", "ENSO", "LAB", "CLO",
    "WBAI", "RECALL", "RVV", "ANOME", "SUBHUB", "MERL", "MYX", "SVSA", "SIGMA", "BLUAI"
  ];

  const uniqueWords = [...new Set(words)];

  const getSha256Hex = async (input) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const hashBuffer = await subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback for non-HTTPS contexts or environments without Web Crypto.
    return bytesToHex(sha256(data));
  };

  const generateRandomPositions = () => {
    const positions = [];
    const minDistance = 3;
    const wordsPerBatch = 50;
    const batchDuration = 3;

    const formBoxTop = 35;
    const formBoxBottom = 65;
    const formBoxLeft = 15;
    const formBoxRight = 85;

    const isInFormBoxArea = (top, left) => {
      return top >= formBoxTop && top <= formBoxBottom &&
        left >= formBoxLeft && left <= formBoxRight;
    };

    const shuffledWords = [...uniqueWords].sort(() => Math.random() - 0.5);
    const selectedWords = shuffledWords.slice(0, wordsPerBatch);

    const gridRows = 5;
    const gridCols = 5;
    const gridPositions = [];

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const topStart = (row / gridRows) * 100;
        const topEnd = ((row + 1) / gridRows) * 100;
        const leftStart = (col / gridCols) * 100;
        const leftEnd = ((col + 1) / gridCols) * 100;

        let attempts = 0;
        let top, left;
        do {
          top = topStart + Math.random() * (topEnd - topStart);
          left = leftStart + Math.random() * (leftEnd - leftStart);
          attempts++;
          top = Math.max(5, Math.min(95, top));
          left = Math.max(5, Math.min(95, left));
        } while (attempts < 20 && isInFormBoxArea(top, left));

        if (!isInFormBoxArea(top, left)) {
          gridPositions.push({ top, left, used: false });
        }
      }
    }

    gridPositions.sort(() => Math.random() - 0.5);

    let gridIndex = 0;
    for (let i = 0; i < selectedWords.length; i++) {
      let attempts = 0;
      let position;
      const batchIndex = Math.floor(i / wordsPerBatch);
      const showDelay = batchIndex * batchDuration;
      const hideDelay = showDelay + batchDuration - 1;

      do {
        if (gridIndex < gridPositions.length && !gridPositions[gridIndex].used) {
          position = {
            word: selectedWords[i],
            id: `${Date.now()}-${i}-${Math.random()}`,
            top: gridPositions[gridIndex].top,
            left: gridPositions[gridIndex].left,
            batchIndex: batchIndex,
            showDelay: showDelay,
            hideDelay: hideDelay,
            animationDuration: 1 + Math.random() * 2,
          };
          gridPositions[gridIndex].used = true;
          gridIndex++;
        } else {
          let top = Math.random() * 80 + 10;
          let left = Math.random() * 80 + 10;

          if (isInFormBoxArea(top, left)) {
            if (Math.random() > 0.5) {
              top = Math.random() * (formBoxTop - 10) + 5;
            } else {
              top = Math.random() * (100 - formBoxBottom - 10) + formBoxBottom + 5;
            }
            left = Math.random() * 80 + 10;
          }

          position = {
            word: selectedWords[i],
            id: `${Date.now()}-${i}-${Math.random()}`,
            top: top,
            left: left,
            batchIndex: batchIndex,
            showDelay: showDelay,
            hideDelay: hideDelay,
            animationDuration: 1 + Math.random() * 2,
          };
        }
        attempts++;
      } while (
        attempts < 100 &&
        positions.some(existing => {
          const distance = Math.sqrt(
            Math.pow(position.top - existing.top, 2) +
            Math.pow(position.left - existing.left, 2)
          );
          return distance < minDistance;
        })
      );

      if (position && !isInFormBoxArea(position.top, position.left)) {
        positions.push(position);
      }
    }

    return positions;
  };

  const [wordPositions, setWordPositions] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [xHandle, setXHandle] = useState('');
  const [tweetLink, setTweetLink] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationToken, setValidationToken] = useState(null);
  const usedTokensRef = useRef(new Set());
  const [clickedWord, setClickedWord] = useState(null);
  const [clickedWordFading, setClickedWordFading] = useState(false);
  const [toastItems, setToastItems] = useState([]);
  const [walletAccount, setWalletAccount] = useState('');
  const [walletDisconnected, setWalletDisconnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDisconnectOpen, setMobileDisconnectOpen] = useState(false);
  const [mintPending, setMintPending] = useState(false);
  const [swapPending, setSwapPending] = useState(false);
  const [refundPending, setRefundPending] = useState(false);
  const [yourMintWei, setYourMintWei] = useState(0n);
  const [freeMintCapWei, setFreeMintCapWei] = useState(0n);
  const [totalMintedFreeWei, setTotalMintedFreeWei] = useState(0n);
  const [mintStatsLoading, setMintStatsLoading] = useState(true);
  const [mintStatsReady, setMintStatsReady] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);
  const toastTimersRef = useRef(new Set());
  const toastIdRef = useRef(1);
  const clickWordTimerRef = useRef(null);
  const formContainerRef = useRef(null);
  const mintSectionRef = useRef(null);
  const [floatingParticles, setFloatingParticles] = useState([]);
  const [mobileView, setMobileView] = useState('mint');

  const alphaContractAddress = ALPHA_CONTRACT_ADDRESS;
  const showRefundButton = true;
  const NETWORK_SWITCH_NOTICE = `Please switch to ${BSC_CHAIN_NAME}.`;
  const MINT_WHITELIST_SELECTOR = ALPHA_FUNCTION_SELECTORS.mintWhitelist;
  const SWAP_TO_AL_SELECTOR = ALPHA_FUNCTION_SELECTORS.swapToAL;
  const REFUND_BNB_SELECTOR = ALPHA_FUNCTION_SELECTORS.refundBNB;
  const SWAP_ENABLED_SELECTOR = ALPHA_FUNCTION_SELECTORS.swapEnabled;
  const REFUND_ENABLED_SELECTOR = ALPHA_FUNCTION_SELECTORS.refundEnabled;
  const CLAIMABLE_SELECTOR = ALPHA_FUNCTION_SELECTORS.claimable;
  const TX_PENDING = mintPending || swapPending || refundPending;
  const isMobileViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  const faqs = [
    {
      question: 'What are the requirements to join the free mint?',
      answer: 'Submit your Binance Keyless Wallet address to participate in the campaign.',
    },
    {
      question: 'When will the tokens be distributed?',
      answer: 'Tokens will be claimable after trading opens. Exact timing will be announced.',
    },
    {
      question: 'Can I submit more than one wallet?',
      answer: 'One wallet per participant. Duplicate submissions will be rejected.',
    },
  ];

  const chartSegments = [
    {
      key: 'mint',
      label: 'Mint',
      value: 60,
      dotClass: 'bg-[#ff7a1a] shadow-[0_0_8px_rgba(255,122,26,0.7)]',
      strokeClass: 'stroke-[#ff7a1a]',
      badgeClass: 'border-[#ff7a1a]/40 bg-[#ff7a1a]/15 text-[#ffd1a3]',
    },
    {
      key: 'liquidity',
      label: 'Liquidity',
      value: 25,
      dotClass: 'bg-amber-300',
      strokeClass: 'stroke-amber-300',
      badgeClass: 'border-amber-300/40 bg-amber-300/15 text-amber-200',
    },
    {
      key: 'paid',
      label: 'Paid Address',
      value: 15,
      dotClass: 'bg-amber-200',
      strokeClass: 'stroke-amber-200',
      badgeClass: 'border-amber-200/40 bg-amber-200/15 text-amber-100',
    },
  ];
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;

  const calcProgressPercent = (minted, cap) => {
    if (cap <= 0n) return 0;
    const raw = Number((minted * 10000n) / cap) / 100;
    return Math.max(0, Math.min(100, raw));
  };

  const formatTokenAmount = (value, fractionDigits = 4) => {
    let raw = 0n;
    try {
      raw = BigInt(value || 0);
    } catch {
      raw = 0n;
    }
    const negative = raw < 0n;
    const abs = negative ? -raw : raw;
    const base = 10n ** 18n;
    const whole = abs / base;
    const fraction = (abs % base).toString().padStart(18, '0');
    const shownFraction = fraction.slice(0, fractionDigits).replace(/0+$/, '');
    const body = shownFraction ? `${whole.toString()}.${shownFraction}` : whole.toString();
    return negative ? `-${body}` : body;
  };

  const freeMintProgressPercent = calcProgressPercent(totalMintedFreeWei, freeMintCapWei);
  const freeMintProgressText = `${freeMintProgressPercent.toFixed(2)}%`;
  const yourMintText = walletAccount ? formatTokenAmount(yourMintWei) : '--';
  const freeMintProgressDisplay = mintStatsReady ? freeMintProgressText : '-.--';
  const yourMintDisplay = mintStatsReady ? yourMintText : '--';

  const formatWalletAddress = (address) => {
    if (!address || address.length < 10) {
      return '';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatWalletAddressMobile = (address) => {
    const text = String(address || '').trim();
    if (!text) return '';
    if (/^0x[a-fA-F0-9]{40}$/.test(text)) {
      return `${text.slice(0, 5)}...${text.slice(-4)}`;
    }
    return formatWalletAddress(text);
  };

  const pickPreferredWalletAddress = (...candidates) => {
    const values = candidates
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);

    if (values.length === 0) {
      return '';
    }

    const scoreAddress = (addr) => {
      let score = addr.length;
      if (!addr.includes('...')) {
        score += 1000;
      }
      if (/^0x[a-fA-F0-9]+$/.test(addr)) {
        score += 100;
      }
      return score;
    };

    return values.sort((a, b) => scoreAddress(b) - scoreAddress(a))[0];
  };

  const pushWalletNotice = (message) => {
    const text = String(message || '').trim();
    if (!text) return;
    const id = toastIdRef.current++;
    setToastItems((prev) => [...prev, { id, text, leaving: false }]);

    const leaveTimer = setTimeout(() => {
      setToastItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, leaving: true } : item))
      );
      toastTimersRef.current.delete(leaveTimer);
    }, 2800);
    toastTimersRef.current.add(leaveTimer);

    const removeTimer = setTimeout(() => {
      setToastItems((prev) => prev.filter((item) => item.id !== id));
      toastTimersRef.current.delete(removeTimer);
    }, 3300);
    toastTimersRef.current.add(removeTimer);
  };

  const getBinanceProvider = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (window.binancew3w?.ethereum?.request) {
      return window.binancew3w.ethereum;
    }

    if (window.BinanceChain?.request) {
      return window.BinanceChain;
    }

    const eth = window.ethereum;
    if (!eth) {
      return null;
    }

    const hasBinanceFlag = (provider) =>
      provider?.isBinance ||
      provider?.isBinanceChain ||
      provider?.isBinanceWallet ||
      provider?.isBinanceChainWallet ||
      provider?.isBinanceWeb3Wallet;

    if (Array.isArray(eth.providers) && eth.providers.length > 0) {
      const binanceProvider = eth.providers.find(hasBinanceFlag);
      return binanceProvider || null;
    }

    if (hasBinanceFlag(eth)) {
      return eth;
    }
    return null;
  };

  const normalizeChainIdHex = (chainIdValue) => {
    const text = String(chainIdValue || '').trim();
    if (!text) return '';
    if (/^0x[0-9a-f]+$/i.test(text)) {
      return `0x${text.slice(2).toLowerCase()}`;
    }
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed > 0) {
      return `0x${Math.floor(parsed).toString(16)}`;
    }
    return '';
  };

  const decodeHexUtf8 = (hexText) => {
    const clean = String(hexText || '').replace(/^0x/i, '');
    if (!clean || clean.length % 2 !== 0) return '';
    try {
      const bytes = [];
      for (let i = 0; i < clean.length; i += 2) {
        bytes.push(parseInt(clean.slice(i, i + 2), 16));
      }
      return new TextDecoder().decode(new Uint8Array(bytes)).replace(/\u0000/g, '').trim();
    } catch {
      return '';
    }
  };

  const decodeRevertReason = (error) => {
    const message = String(error?.message || '').trim();
    const nestedMessages = [
      error?.error?.message,
      error?.info?.error?.message,
      error?.originalError?.message,
    ]
      .map((msg) => String(msg || '').trim())
      .filter(Boolean);
    const maybeData =
      error?.data ||
      error?.error?.data ||
      error?.info?.error?.data ||
      error?.originalError?.data ||
      '';

    const dataText = typeof maybeData === 'string' ? maybeData : maybeData?.data || '';
    const data = String(dataText || '').toLowerCase();
    // Error(string): 0x08c379a0 + offset(32) + len(32) + utf8 bytes
    if (data.startsWith('0x08c379a0') && data.length >= 138) {
      const lenHex = data.slice(74, 138);
      const reasonLen = Number.parseInt(lenHex, 16);
      if (Number.isFinite(reasonLen) && reasonLen > 0) {
        const start = 138;
        const end = start + reasonLen * 2;
        const reasonHex = `0x${data.slice(start, end)}`;
        const decoded = decodeHexUtf8(reasonHex);
        if (decoded) return decoded;
      }
    }

    if (message) {
      const idx = message.toLowerCase().indexOf('execution reverted');
      if (idx >= 0) {
        const tail = message.slice(idx + 'execution reverted'.length).replace(/^[:\s-]+/, '').trim();
        return tail || 'Execution reverted';
      }
      const nestedRevert = nestedMessages.find((msg) => /execution reverted/i.test(msg));
      if (nestedRevert) {
        const nestedIdx = nestedRevert.toLowerCase().indexOf('execution reverted');
        const tail = nestedRevert
          .slice(nestedIdx + 'execution reverted'.length)
          .replace(/^[:\s-]+/, '')
          .trim();
        return tail || 'Execution reverted';
      }
      return message;
    }

    return 'CONTRACT CALL REVERTED';
  };

  const preflightContractTx = async (provider, from, data, valueHex = '0x0') => {
    try {
      await provider.request({
        method: 'eth_call',
        params: [
          {
            from,
            to: alphaContractAddress,
            data,
            value: valueHex,
          },
          'latest',
        ],
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: decodeRevertReason(error) };
    }
  };

  const normalizeBlockedReason = (action, reason) => {
    const text = String(reason || '').trim();
    if (!text) return 'CONTRACT CALL REVERTED';
    if (
      String(action || '').toUpperCase() === 'REFUND' &&
      /internal json-rpc error/i.test(text)
    ) {
      return 'ALREADY REFUNDED OR NOTHING TO REFUND';
    }
    return text;
  };

  const decodeAbiBool = (value) => {
    const clean = String(value || '').replace(/^0x/i, '').trim();
    if (!clean) return null;
    try {
      return BigInt(`0x${clean}`) !== 0n;
    } catch {
      return null;
    }
  };

  const readContractBool = async (provider, selector) => {
    const data = String(selector || '').trim();
    if (!/^0x[a-fA-F0-9]{8}$/.test(data)) {
      return null;
    }

    try {
      const result = await provider.request({
        method: 'eth_call',
        params: [{ to: alphaContractAddress, data }, 'latest'],
      });
      return decodeAbiBool(result);
    } catch {
      return null;
    }
  };

  const encodeAddressArg = (address) => {
    const clean = String(address || '').trim().replace(/^0x/i, '').toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(clean)) return '';
    return clean.padStart(64, '0');
  };

  const readContractUintByAddress = async (provider, selector, address) => {
    const sig = String(selector || '').trim();
    const encodedAddress = encodeAddressArg(address);
    if (!/^0x[a-fA-F0-9]{8}$/.test(sig) || !encodedAddress) {
      return null;
    }

    try {
      const result = await provider.request({
        method: 'eth_call',
        params: [{ to: alphaContractAddress, data: `${sig}${encodedAddress}` }, 'latest'],
      });
      const clean = String(result || '').replace(/^0x/i, '').trim();
      if (!clean) return 0n;
      return BigInt(`0x${clean}`);
    } catch {
      return null;
    }
  };

  const ensureCorrectNetwork = async (provider, options = {}) => {
    const { allowAdd = false } = options || {};
    const targetChainId = normalizeChainIdHex(BSC_WALLET_NETWORK.chainId);
    const currentChainId = normalizeChainIdHex(await provider.request({ method: 'eth_chainId' }));

    if (currentChainId === targetChainId) {
      return;
    }
    const wrongNetworkError = new Error('WRONG_NETWORK');
    wrongNetworkError.code = 'WRONG_NETWORK';
    wrongNetworkError.allowAdd = allowAdd;
    throw wrongNetworkError;
  };

  const isNetworkSwitchIssue = (error) => {
    if (!error) return false;
    if (error?.code === 'WRONG_NETWORK') return true;
    if (error?.code === 4902) return true;
    const msg = String(error?.message || '').toLowerCase();
    return (
      msg.includes('chain') ||
      msg.includes('network') ||
      msg.includes('switchethereumchain') ||
      msg.includes('unsupported')
    );
  };

  const handleConnectWallet = async (e) => {
    e?.stopPropagation();
    if (walletAccount && isMobileViewport()) {
      setMobileDisconnectOpen((prev) => !prev);
      return;
    }
    const provider = getBinanceProvider();
    if (!provider?.request) {
      pushWalletNotice('Binance Wallet not detected. Please enable the extension and refresh.');
      return;
    }
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (Array.isArray(accounts) && accounts.length > 0) {
        setWalletAccount(
          pickPreferredWalletAddress(
            accounts[0],
            provider?.selectedAddress,
            provider?.address
          )
        );
        setWalletDisconnected(false);
        setMobileDisconnectOpen(false);
        pushWalletNotice('Wallet connected.');
      } else {
        pushWalletNotice('Wallet connection failed.');
      }
    } catch (err) {
      if (err?.code === 4001) {
        pushWalletNotice('Connection cancelled.');
        return;
      }
      pushWalletNotice('Wallet connection failed.');
    }
  };

  const encodeMintWhitelistCallData = (proof) => {
    const selector = String(MINT_WHITELIST_SELECTOR || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{8}$/.test(selector)) {
      throw new Error('MINT SELECTOR NOT CONFIGURED');
    }

    if (!Array.isArray(proof)) {
      throw new Error('INVALID WHITELIST PROOF');
    }

    const offsetHex = '0000000000000000000000000000000000000000000000000000000000000020';
    const lengthHex = proof.length.toString(16).padStart(64, '0');
    const proofHex = proof
      .map((item) => {
        const clean = String(item || '').trim().toLowerCase();
        if (!/^0x[a-f0-9]{64}$/.test(clean)) {
          throw new Error('INVALID PROOF ITEM');
        }
        return clean.slice(2);
      })
      .join('');

    return `${selector}${offsetHex}${lengthHex}${proofHex}`;
  };

  const handleMintClick = async (e) => {
    e?.stopPropagation();
    setMobileView('mint');
    setMobileMenuOpen(false);

    if (TX_PENDING) {
      return;
    }

    const provider = getBinanceProvider();
    if (!provider?.request) {
      pushWalletNotice('Binance Wallet not detected.');
      return;
    }

    if (!walletAccount || !/^0x[a-fA-F0-9]{40}$/.test(walletAccount)) {
      pushWalletNotice('CONNECT WALLET FIRST');
      return;
    }

    setMintPending(true);
    try {
      await ensureCorrectNetwork(provider, { allowAdd: false });

      let from = walletAccount;
      if (!from || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
        pushWalletNotice('CONNECT WALLET FIRST');
        return;
      }

      const proofResponse = await fetch(
        `/api/whitelist-proof?address=${encodeURIComponent(from)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }
      );

      let proofPayload;
      try {
        proofPayload = await proofResponse.json();
      } catch {
        pushWalletNotice('WHITELIST PROOF FETCH FAILED');
        return;
      }

      if (!proofResponse.ok || !proofPayload?.success) {
        pushWalletNotice(proofPayload?.message || 'NOT IN WHITELIST');
        return;
      }

      const proof = Array.isArray(proofPayload?.data?.proof) ? proofPayload.data.proof : [];
      const data = encodeMintWhitelistCallData(proof);
      await sendContractTx(data, 'MINT');
    } catch (error) {
      if (error?.code === 4001) {
        pushWalletNotice('MINT CANCELLED');
      } else if (isNetworkSwitchIssue(error)) {
        pushWalletNotice(NETWORK_SWITCH_NOTICE);
      } else {
        pushWalletNotice(error?.message || 'MINT FAILED');
      }
    } finally {
      setMintPending(false);
    }
  };

  const handleAirdropClick = (e) => {
    e?.stopPropagation();
    setMobileView('airdrop');
    setMobileMenuOpen(false);
    if (isMobileViewport()) {
      return;
    }
    formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLogoClick = (e) => {
    e?.stopPropagation();
    setMobileView('mint');
    setMobileMenuOpen(false);
    mintSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenMintPanel = (e) => {
    e?.stopPropagation();
    setMobileView('mint');
    setMobileMenuOpen(false);
    if (!isMobileViewport()) {
      mintSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const loadMintStats = useCallback(async () => {
    const accountParam =
      walletAccount && /^0x[a-fA-F0-9]{40}$/.test(walletAccount)
        ? `?address=${encodeURIComponent(walletAccount)}`
        : '';
    try {
      const response = await fetch(`/api/mint-stats${accountParam}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const data = await response.json();
      if (data?.success && data?.data) {
        setFreeMintCapWei(BigInt(data.data.freeMintCap || '0'));
        setTotalMintedFreeWei(BigInt(data.data.totalMintedFree || '0'));
        const account = data.data.account;
        if (account) {
          const mintedFreeBy = BigInt(account.mintedFreeBy || '0');
          setYourMintWei(mintedFreeBy);
        } else {
          setYourMintWei(0n);
        }
        setMintStatsReady(true);
      }
    } catch {
      // Ignore temporary network failures; next polling tick will retry.
    } finally {
      setMintStatsLoading(false);
    }
  }, [walletAccount]);

  useEffect(() => {
    loadMintStats();
    const timer = setInterval(loadMintStats, 30000);

    return () => clearInterval(timer);
  }, [loadMintStats]);

  const sendContractTx = async (data, action, valueHex = '0x0', options = {}) => {
    const {
      enabledSelector = '',
      disabledReason = '',
      minAmountSelector = '',
      zeroAmountReason = '',
    } = options || {};
    const provider = getBinanceProvider();
    if (!provider?.request) {
      pushWalletNotice('Binance Wallet not detected.');
      return;
    }

    if (!alphaContractAddress || !/^0x[a-fA-F0-9]{40}$/.test(alphaContractAddress)) {
      pushWalletNotice('CONTRACT ADDRESS NOT CONFIGURED');
      return;
    }

    let from = walletAccount;

    if (!from || !/^0x[a-fA-F0-9]{40}$/.test(from)) {
      pushWalletNotice('CONNECT WALLET FIRST');
      return;
    }

    try {
      await ensureCorrectNetwork(provider, { allowAdd: false });
      if (enabledSelector) {
        const isEnabled = await readContractBool(provider, enabledSelector);
        if (isEnabled === false) {
          pushWalletNotice(`${action} BLOCKED: ${disabledReason || 'NOT ENABLED'}`);
          return;
        }
      }
      if (minAmountSelector) {
        const amount = await readContractUintByAddress(provider, minAmountSelector, from);
        if (amount === 0n) {
          pushWalletNotice(`${action} BLOCKED: ${zeroAmountReason || 'NOTHING AVAILABLE'}`);
          return;
        }
      }
      const preflight = await preflightContractTx(provider, from, data, valueHex);
      if (!preflight.ok) {
        pushWalletNotice(`${action} BLOCKED: ${normalizeBlockedReason(action, preflight.reason)}`);
        return;
      }
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to: alphaContractAddress,
            data,
            value: valueHex,
          },
        ],
      });
      pushWalletNotice(
        `${action} TX SENT: ${String(txHash).slice(0, 10)}...${String(txHash).slice(-8)}`
      );
      loadMintStats();
    } catch (err) {
      if (err?.code === 4001) {
        pushWalletNotice(`${action} CANCELLED`);
      } else if (isNetworkSwitchIssue(err)) {
        pushWalletNotice(NETWORK_SWITCH_NOTICE);
      } else {
        pushWalletNotice(`${action} FAILED`);
      }
    }
  };

  const handleSwapToAL = async () => {
    if (TX_PENDING) return;
    setSwapPending(true);
    try {
      await sendContractTx(SWAP_TO_AL_SELECTOR, 'CLAIM', '0x0', {
        enabledSelector: SWAP_ENABLED_SELECTOR,
        disabledReason: 'SWAP NOT ENABLED',
        minAmountSelector: CLAIMABLE_SELECTOR,
        zeroAmountReason: 'ALREADY CLAIMED OR NOTHING TO CLAIM',
      });
    } finally {
      setSwapPending(false);
    }
  };

  const handleRefundBNB = async () => {
    if (TX_PENDING) return;
    setRefundPending(true);
    try {
      await sendContractTx(REFUND_BNB_SELECTOR, 'REFUND', '0x0', {
        enabledSelector: REFUND_ENABLED_SELECTOR,
        disabledReason: 'REFUND NOT ENABLED',
      });
    } finally {
      setRefundPending(false);
    }
  };


  const validateWallet = async (walletAddress) => {
    const queryResponse = await fetch(
      `/api/verify-wallet?address=${encodeURIComponent(walletAddress.trim())}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    let messageObj;
    try {
      messageObj = await queryResponse.json();
    } catch {
      return { success: false, message: 'PLEASE TRY AGAIN LATER' };
    }

    const result = Boolean(messageObj?.success);

    if (result) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const addressHash = walletAddress.substring(0, 8) + walletAddress.substring(walletAddress.length - 8);
      const uniqueToken = `${timestamp}-${random}-${addressHash}`;

      const encoder = new TextEncoder();
      const secret = 'alpha-project-secret-key';
      const signatureHex = await getSha256Hex(uniqueToken + secret);
      const finalToken = `${uniqueToken}-${signatureHex.substring(0, 16)}`;

      return {
        success: true,
        token: finalToken,
        expiresAt: timestamp + 3000,
      };
    }

    return { success: false, message: messageObj?.message || 'YOUR ADDRESS IS NOT ELIGIBLE' };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setValidationMessage('');

    if (!xHandle || !xHandle.trim()) {
      setValidationMessage('X HANDLE CANNOT BE EMPTY');
      setSubmitting(false);
      return;
    }

    if (!tweetLink || !tweetLink.trim()) {
      setValidationMessage('TWEET LINK CANNOT BE EMPTY');
      setSubmitting(false);
      return;
    }

    if (!walletAddress || !walletAddress.trim()) {
      setValidationMessage('BINANCE KEYLESS WALLET ADDRESS CANNOT BE EMPTY');
      setSubmitting(false);
      return;
    }

    try {
      let token = validationToken;

      if (!token || Date.now() > token.expiresAt) {
        const validationResult = await validateWallet(walletAddress);

        if (!validationResult.success) {
          setValidationMessage(validationResult.message || 'YOUR ADDRESS IS NOT A BINANCE KEYLESS WALLET ADDRESS, PLEASE RE-ENTER');
          setValidationToken(null);
          setSubmitting(false);
          return;
        }

        token = {
          token: validationResult.token,
          expiresAt: validationResult.expiresAt,
          walletAddress: walletAddress.trim()
        };
        setValidationToken(token);
      } else {
        if (token.walletAddress !== walletAddress.trim()) {
          setValidationMessage('WALLET ADDRESS MISMATCH, PLEASE RE-VALIDATE');
          setValidationToken(null);
          setSubmitting(false);
          return;
        }
      }

      if (Date.now() > token.expiresAt) {
        setValidationMessage('VALIDATION TOKEN EXPIRED, PLEASE RE-VALIDATE');
        setValidationToken(null);
        setSubmitting(false);
        return;
      }

      if (usedTokensRef.current.has(token.token)) {
        setValidationMessage('TOKEN ALREADY USED, PLEASE RE-VALIDATE');
        setValidationToken(null);
        setSubmitting(false);
        return;
      }

      const tokenParts = token.token.split('-');
      if (tokenParts.length < 4) {
        setValidationMessage('INVALID TOKEN FORMAT');
        setValidationToken(null);
        setSubmitting(false);
        return;
      }

      const uniqueToken = `${tokenParts[0]}-${tokenParts[1]}-${tokenParts[2]}`;
      const secret = 'alpha-project-secret-key';
      const signatureHex = await getSha256Hex(uniqueToken + secret);
      const expectedSignature = signatureHex.substring(0, 16);

      if (tokenParts[3] !== expectedSignature) {
        setValidationMessage('INVALID TOKEN SIGNATURE');
        setValidationToken(null);
        setSubmitting(false);
        return;
      }

      const addressHash = tokenParts[2];
      const expectedHash = walletAddress.substring(0, 8) + walletAddress.substring(walletAddress.length - 8);
      if (addressHash !== expectedHash) {
        setValidationMessage('TOKEN WALLET ADDRESS MISMATCH');
        setValidationToken(null);
        setSubmitting(false);
        return;
      }

      usedTokensRef.current.add(token.token);

      const submitResponse = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xHandle: xHandle.trim(),
          tweetLink: tweetLink.trim(),
          walletAddress: walletAddress.trim(),
          token: token.token
        }),
      });

      let submitData;
      try {
        submitData = await submitResponse.json();
      } catch (parseErr) {
        setValidationMessage('PLEASE TRY AGAIN LATER');
        usedTokensRef.current.delete(token.token);
        setValidationToken(null);
        return;
      }

      if (submitResponse.ok && submitData.success) {
        setValidationMessage('SUBMIT SUCCESS');
        setXHandle('');
        setTweetLink('');
        setWalletAddress('');
      } else {
        setValidationMessage(submitData.message || 'SUBMIT FAILED, PLEASE TRY AGAIN LATER');
        usedTokensRef.current.delete(token.token);
      }

      setValidationToken(null);

    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('Unexpected token') || err?.name === 'SyntaxError') {
        setValidationMessage('PLEASE TRY AGAIN LATER');
      } else {
        setValidationMessage(msg || 'REQUEST ERROR');
      }
      setValidationToken(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageClick = (e) => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    if (mobileDisconnectOpen) {
      setMobileDisconnectOpen(false);
    }
    if (e.target.closest('a,button,input,textarea,select,form')) {
      return;
    }

    const navElement = e.target.closest('nav');
    if (navElement) {
      return;
    }

    const x = typeof e.clientX === 'number' ? e.clientX : null;
    const y = typeof e.clientY === 'number' ? e.clientY : null;

    if (x === null || y === null) {
      return;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const left = clamp(x, 8, window.innerWidth - 8);
    const top = clamp(y, 8, window.innerHeight - 8);

    if (clickWordTimerRef.current) {
      clearTimeout(clickWordTimerRef.current);
      clickWordTimerRef.current = null;
    }

    setClickedWordFading(false);

    const randomWord = uniqueWords[Math.floor(Math.random() * uniqueWords.length)];

    setClickedWord({
      word: randomWord,
      left: left,
      top: top,
      id: Date.now()
    });

    clickWordTimerRef.current = setTimeout(() => {
      setClickedWordFading(true);
      clickWordTimerRef.current = setTimeout(() => {
        setClickedWord(null);
        setClickedWordFading(false);
        clickWordTimerRef.current = null;
      }, 500);
    }, 2500);
  };

  const handleDisconnectWallet = (e) => {
    e?.stopPropagation();
    setWalletAccount('');
    setWalletDisconnected(true);
    setMobileDisconnectOpen(false);
    pushWalletNotice('Wallet disconnected.');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => {
      setIsMobile(media.matches);
      setViewportReady(true);
    };
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
    } else if (media.addListener) {
      media.addListener(update);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', update);
      } else if (media.removeListener) {
        media.removeListener(update);
      }
    };
  }, []);

  useEffect(() => {
    if (!viewportReady) {
      return undefined;
    }

    // Generate floating particles only on client side after mount to avoid hydration mismatch
    const particleCount = isMobile ? 12 : 30;
    setFloatingParticles(
      Array.from({ length: particleCount }, () => ({
        width: Math.random() * 4 + 2,
        height: Math.random() * 4 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
      }))
    );

    let timer;
    if (!isMobile) {
      setWordPositions(generateRandomPositions());

      timer = setInterval(() => {
        setCurrentBatch(prev => prev + 1);
        setWordPositions(generateRandomPositions());
      }, 3000);
    } else {
      setWordPositions([]);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (clickWordTimerRef.current) {
        clearTimeout(clickWordTimerRef.current);
      }
    };
  }, [isMobile, viewportReady]);

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current) {
        clearTimeout(timer);
      }
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const provider = getBinanceProvider();
    if (!provider?.request) {
      return;
    }

    if (walletDisconnected) {
      setWalletAccount('');
      return;
    }

    let isStale = false;
    provider.request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (!isStale) {
          setWalletAccount(
            pickPreferredWalletAddress(
              Array.isArray(accounts) ? (accounts[0] || '') : '',
              provider?.selectedAddress,
              provider?.address
            )
          );
        }
      })
      .catch(() => { });

    const handleAccountsChanged = (accounts) => {
      if (walletDisconnected) {
        return;
      }
      setWalletAccount(
        pickPreferredWalletAddress(
          Array.isArray(accounts) ? (accounts[0] || '') : '',
          provider?.selectedAddress,
          provider?.address
        )
      );
    };

    if (provider.on) {
      provider.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      isStale = true;
      if (provider.removeListener) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [walletDisconnected]);

  return (
    <div
      className="min-h-screen bg-black relative overflow-x-hidden sm:h-screen sm:overflow-y-auto sm:overscroll-contain"
      onClick={handlePageClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-orange-950/10 pointer-events-none"></div>

      <div className="absolute inset-0 opacity-5 sm:opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(251, 146, 60, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251, 146, 60, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: isMobile ? 'none' : 'gridMove 20s linear infinite'
        }}></div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingParticles.map((particle, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-orange-400/10 blur-none sm:blur-sm"
            style={{
              width: `${particle.width}px`,
              height: `${particle.height}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: isMobile ? 'none' : `float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`
            }}
          ></div>
        ))}
        <div className="absolute -top-56 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-400/10 blur-3xl"></div>

        <div className="absolute top-24 left-6 w-24 h-24 border border-orange-400/30 rotate-45 animate-none sm:animate-pulse opacity-40 sm:top-20 sm:left-10 sm:w-40 sm:h-40 sm:border-orange-400/40 sm:opacity-100"></div>
        <div className="absolute bottom-24 right-6 w-20 h-20 border border-orange-400/30 rotate-12 animate-none sm:animate-pulse opacity-40 sm:bottom-20 sm:right-10 sm:w-32 sm:h-32 sm:border-orange-400/40 sm:opacity-100" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[52%] right-4 w-16 h-16 border border-orange-400/25 -rotate-45 animate-none sm:animate-pulse opacity-30 sm:top-1/2 sm:right-20 sm:w-20 sm:h-20 sm:border-orange-400/40 sm:opacity-100" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[28%] left-4 w-20 h-20 border border-orange-400/25 rotate-45 animate-none sm:animate-pulse opacity-35 sm:top-1/3 sm:left-20 sm:w-24 sm:h-24 sm:border-orange-400/40 sm:opacity-100" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-orange-400/10 bg-black">
        <div className="container mx-auto px-5 py-2.5 sm:px-4 sm:py-3">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2"
              onClick={handleLogoClick}
              aria-label="Back to top"
            >
              <span className="text-base font-semibold tracking-tight bg-gradient-to-r from-orange-200 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                ALPHA
              </span>
              <span className="hidden sm:inline text-xs text-orange-100/40">
                Keyless Wallet Experiment
              </span>
            </button>

            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen((prev) => !prev);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-orange-400/20 bg-black/40 px-2 py-1.5 text-[10px] font-semibold text-orange-100/80 hover:bg-black/50"
                aria-expanded={mobileMenuOpen}
                aria-label="Open menu"
              >
                Menu
              </button>

              {mobileMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border border-orange-400/20 bg-black/80 shadow-[0_0_25px_rgba(251,146,60,0.25)]">
                  <button
                    type="button"
                    onClick={handleOpenMintPanel}
                    className="flex w-full items-center justify-center px-3 py-2 text-xs font-semibold text-orange-100/80 hover:bg-black/60"
                  >
                    Mint
                  </button>
                  <button
                    type="button"
                    onClick={handleAirdropClick}
                    className="flex w-full items-center justify-center px-3 py-2 text-xs font-semibold text-orange-100/80 hover:bg-black/60"
                  >
                    Airdrop
                  </button>
                  <a
                    href="https://x.com/BNB_ALPHA_LABS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center px-3 py-2 text-xs font-semibold text-orange-100/80 hover:bg-black/60"
                    title="Open X"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                    }}
                  >
                    X
                  </a>
                </div>
              )}
            </div>
            </div>

            <div className="mr-4 flex items-center justify-end gap-1.5 shrink-0 sm:mr-0 sm:gap-3">
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  aria-expanded={walletAccount ? mobileDisconnectOpen : undefined}
                  className="inline-flex min-w-[108px] items-center justify-center rounded-lg border border-orange-400/20 bg-black/40 px-2 py-1.5 text-[10px] font-semibold text-orange-100/80 transition-colors hover:bg-black/50 hover:text-orange-100 sm:min-w-0 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
                  title="Connect Binance Wallet"
                >
                  <span className="sm:hidden whitespace-nowrap text-[10px] leading-none">
                    {walletAccount ? formatWalletAddressMobile(walletAccount) : 'Connect'}
                  </span>
                  <span className="hidden sm:inline">
                    {walletAccount ? formatWalletAddress(walletAccount) : 'Connect Binance Wallet'}
                  </span>
                </button>
                {walletAccount && mobileDisconnectOpen && (
                  <div className="absolute right-0 top-full mt-2 sm:hidden z-40">
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      className="flex items-center justify-center rounded-lg border border-orange-400/20 bg-black/80 px-3 py-2 text-xs font-semibold text-orange-100/80 shadow-[0_0_20px_rgba(251,146,60,0.2)]"
                      aria-label="Disconnect wallet"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
                {walletAccount && (
                  <div className="absolute right-0 top-full hidden sm:block">
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      className="flex items-center justify-center rounded-lg border border-orange-400/20 bg-black/70 px-3 py-2 text-xs font-semibold text-orange-100/80 shadow-[0_0_20px_rgba(251,146,60,0.2)] transition-all duration-150 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto hover:bg-black/80"
                      aria-label="Disconnect wallet"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
              <a
                href="https://x.com/BNB_ALPHA_LABS"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center rounded-lg border border-orange-400/15 bg-black/30 px-3 py-2 text-orange-100/80 transition-colors hover:bg-black/40 hover:text-orange-100"
                title="Open X"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                  style={{ pointerEvents: 'none' }}
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {toastItems.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-[min(92vw,24rem)] flex-col items-end gap-2 pointer-events-none">
          {toastItems.map((toast) => (
            <div
              key={toast.id}
              className={`max-w-[92vw] break-words whitespace-normal rounded-lg border border-orange-400/20 bg-black/80 px-3 py-2 text-[10px] leading-tight text-orange-100/85 shadow-[0_0_20px_rgba(251,146,60,0.25)] sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap sm:text-xs transition-all duration-300 ease-out will-change-transform ${
                toast.leaving ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}

      {clickedWord && (
        <div
          key={clickedWord.id}
          className={`fixed z-40 text-orange-200/90 font-mono text-xs sm:text-sm tracking-widest pointer-events-none mix-blend-screen ${clickedWordFading ? 'animate-fade-out' : 'animate-fade-in'
            }`}
          style={{
            left: `${clickedWord.left}px`,
            top: `${clickedWord.top}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {clickedWord.word}
        </div>
      )}

      <main data-page-content="true" className="relative z-20 pt-20 sm:pt-24 pb-6 sm:pb-8">
        <div className="container mx-auto px-5 sm:px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-start">
            <section
              ref={mintSectionRef}
              className={`space-y-6 scroll-mt-24 sm:scroll-mt-28 ${mobileView === 'mint' ? 'block' : 'hidden'} sm:block`}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/15 bg-black/30 px-4 py-2 backdrop-blur-none sm:backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.7)]"></span>
                <span className="text-xs font-medium tracking-wide text-orange-100/70">
                  BINANCE KEYLESS WALLET SOCIAL EXPERIMENT
                </span>
              </div>

              <h1 className="text-center sm:text-left text-[clamp(1.6rem,8.2vw,2.3rem)] leading-tight sm:text-5xl lg:text-6xl font-semibold tracking-tight text-orange-50">
                <span className="whitespace-nowrap">
                  Mint{' '}
                  <span className="bg-gradient-to-r from-orange-200 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                    ALPHA
                  </span>
                </span>
                <br />
                <span className="whitespace-nowrap">Life Token</span>
              </h1>

              <div className="rounded-2xl border border-orange-400/15 bg-black/20 px-3 py-4 sm:p-5 backdrop-blur-none sm:backdrop-blur">
                <div className="text-xs font-semibold tracking-wide text-orange-100/70">Experiment ONE.</div>
                <p className="mt-2 text-xs sm:text-base leading-relaxed text-orange-100/75">
                  Zero fees, gas-only mint for the ALPHA Life Token.
                </p>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleMintClick}
                  disabled={TX_PENDING}
                  className="inline-flex items-center justify-center rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(251,146,60,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {mintPending ? 'Minting...' : 'Mint now'}
                </button>
                <button
                  type="button"
                  onClick={handleAirdropClick}
                  className="inline-flex items-center justify-center rounded-xl border border-orange-400/20 bg-black/30 px-5 py-3 text-sm font-semibold text-orange-100/90 backdrop-blur-none sm:backdrop-blur transition-colors hover:bg-black/40"
                >
                  Airdrop validation
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="block sm:hidden">
                  <div className="relative overflow-hidden rounded-2xl bg-black/35 shadow-[0_0_35px_rgba(251,146,60,0.18)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400/12 via-transparent to-amber-200/12 pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-orange-400/10 pointer-events-none"></div>
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(251, 146, 60, 0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(251, 146, 60, 0.08) 1px, transparent 1px)
                        `,
                        backgroundSize: '36px 36px',
                      }}
                    ></div>
                    <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-orange-400/12 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-6 left-6 h-16 w-16 border border-orange-400/35 rotate-45 pointer-events-none"></div>
                    <div className="relative z-10 p-4 min-h-[300px] flex flex-col">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-orange-100/60">Signal Field</div>
                      <div className="mt-3 text-[10px] sm:text-xs leading-relaxed text-orange-100/55">
                        Only users who are included in the whitelist can participate in the social experiment.
                      </div>
                      <div className="flex-1 flex items-center justify-center pt-6">
                        <div className="space-y-1 text-xs font-semibold text-orange-300 text-center">
                          <div>Your mint: {yourMintDisplay}</div>
                        </div>
                      </div>
                      <div className="mt-2 mb-6">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-orange-100/70">
                          <span>Free mint progress</span>
                          <span>{freeMintProgressDisplay}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-orange-400/15 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
                            style={{ width: `${freeMintProgressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="mt-auto mb-2 text-[10px] leading-relaxed text-orange-100/50">
                        Use Binance Wallet buttons below for Claim and Refund.
                      </div>
                      <div className={`grid ${showRefundButton ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pb-1`}>
                        <button
                          type="button"
                          onClick={handleSwapToAL}
                          disabled={TX_PENDING}
                          className="rounded-lg bg-orange-400 px-3 py-2 text-[11px] font-semibold text-black disabled:opacity-60"
                        >
                          {swapPending ? 'Claiming...' : 'Claim'}
                        </button>
                        {showRefundButton && (
                          <button
                            type="button"
                            onClick={handleRefundBNB}
                            disabled={TX_PENDING}
                            className="rounded-lg border border-orange-400/30 bg-black/30 px-3 py-2 text-[11px] font-semibold text-orange-100 disabled:opacity-60"
                          >
                            {refundPending ? 'Refunding...' : 'Refund'}
                          </button>
                        )}
                      </div>
                      {/* <div className="mt-4 text-[10px] leading-relaxed text-orange-100/45">
                        Note: After launch, you can swap sAL to AL at 1:1.
                      </div> */}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-orange-400/15 bg-black/20 px-3 py-4 sm:p-4 backdrop-blur-none sm:backdrop-blur">
                    <div className="text-xs font-semibold tracking-wide text-orange-100/70">Experiment TWO.</div>
                    <p className="mt-2 text-sm sm:text-base leading-relaxed text-orange-100/55">
                      Send any amount of BNB to the contract address.
                    </p>
                    <div className="mt-2 text-[10px] sm:text-xs leading-relaxed font-semibold text-orange-400">
                      <span>Contract address: </span>
                      <span className="break-all">{alphaContractAddress || 'NOT CONFIGURED'}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-orange-400/15 bg-black/25 px-3 py-4 sm:p-4 backdrop-blur-none sm:backdrop-blur">
                  <div className="text-sm font-semibold text-orange-50">Social experiment</div>
                  <div className="mt-1 text-sm text-orange-100/60">Only pay network gas for minting.</div>
                </div>
                <div className="rounded-2xl border border-orange-400/15 bg-black/25 px-3 py-4 sm:p-4 backdrop-blur-none sm:backdrop-blur">
                  <div className="text-sm font-semibold text-orange-50">Keyless-first</div>
                  <div className="mt-1 text-sm text-orange-100/60">Built for Binance Keyless Wallet users.</div>
                </div>
                {/* <div className="rounded-2xl border border-orange-400/15 bg-black/25 px-3 py-4 sm:p-4 backdrop-blur">
                  <div className="text-sm font-semibold text-orange-50">No custody</div>
                  <div className="mt-1 text-sm text-orange-100/60">We never ask for your private keys.</div>
                </div>
                <div className="rounded-2xl border border-orange-400/15 bg-black/25 px-3 py-4 sm:p-4 backdrop-blur-none sm:backdrop-blur">
                  <div className="text-sm font-semibold text-orange-50">Mobile-ready</div>
                  <div className="mt-1 text-sm text-orange-100/60">Designed to work great on phones.</div>
                </div> */}
              </div>

              <div className="rounded-2xl border border-orange-400/15 bg-black/20 px-3 py-4 sm:p-4 backdrop-blur-none sm:backdrop-blur">
                <p className="text-xs leading-relaxed text-orange-100/60">
                  <span className="font-semibold text-orange-100/80">Security note:</span> Always verify the official mint
                  link before you sign any transaction.
                </p>
              </div>
            </section>

            <aside className="relative hidden lg:block">
              <div className="relative min-h-[520px] overflow-hidden rounded-2xl bg-black/35 backdrop-blur-none sm:backdrop-blur-xl shadow-[0_0_45px_rgba(251,146,60,0.18)]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/12 via-transparent to-amber-200/12 pointer-events-none"></div>
                <div className="absolute inset-0 rounded-2xl ring-1 ring-orange-400/8 pointer-events-none"></div>
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(251, 146, 60, 0.08) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(251, 146, 60, 0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                    animation: 'gridMove 18s linear infinite',
                  }}
                ></div>
                <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-10 left-10 h-28 w-28 border border-orange-400/40 rotate-45 animate-pulse pointer-events-none"></div>
                <div
                  className="absolute top-24 left-16 h-2 w-2 rounded-full bg-orange-300/80"
                  style={{ animation: 'twinkle 2.2s ease-in-out infinite' }}
                ></div>
                {/* <div
                  className="absolute top-40 right-20 h-3 w-3 rounded-full bg-amber-200/70"
                  style={{ animation: 'twinkle 1.8s ease-in-out infinite', animationDelay: '0.6s' }}
                ></div> */}
                <div className="absolute bottom-24 right-12 h-12 w-12 border border-orange-400/30 -rotate-12 pointer-events-none"></div>
                <div className="absolute left-10 right-10 top-1/2 h-12 rounded-full bg-gradient-to-r from-transparent via-orange-400/15 to-transparent blur-2xl pointer-events-none"></div>
                {/* <div
                  className="absolute left-8 bottom-12 h-24 w-1 bg-gradient-to-b from-orange-400/0 via-orange-400/40 to-orange-400/0 pointer-events-none"
                  style={{ animation: 'twinkle 2.4s ease-in-out infinite' }}
                ></div> */}
                <div className="relative z-10 p-6 min-h-[520px] flex flex-col">
                  <div className="text-xs uppercase tracking-[0.35em] text-orange-100/60">Signal Field</div>
                  <div className="mt-4 text-sm leading-relaxed text-orange-100/50">
                    Only users who are included in the whitelist can participate in the social experiment.
                  </div>
                  <div className="flex-1 flex items-center justify-center pt-6">
                    <div className="space-y-1 text-3xl font-semibold text-orange-300 text-center">
                      <div>Your mint: {yourMintDisplay}</div>
                    </div>
                  </div>
                  <div className="mt-3 mb-8">
                    <div className="flex items-center justify-between text-xs font-semibold text-orange-100/70">
                      <span>Free mint progress</span>
                      <span>{freeMintProgressDisplay}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-orange-400/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300"
                        style={{ width: `${freeMintProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-auto mb-2 text-xs leading-relaxed text-orange-100/50">
                    Use Binance Wallet buttons below for Claim and Refund.
                  </div>
                  <div className={`grid ${showRefundButton ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pb-1`}>
                    <button
                      type="button"
                      onClick={handleSwapToAL}
                      disabled={TX_PENDING}
                      className="rounded-xl bg-orange-400 px-4 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(251,146,60,0.35)] disabled:opacity-60"
                    >
                      {swapPending ? 'Claiming...' : 'Claim'}
                    </button>
                    {showRefundButton && (
                      <button
                        type="button"
                        onClick={handleRefundBNB}
                        disabled={TX_PENDING}
                        className="rounded-xl border border-orange-400/30 bg-black/30 px-4 py-3 text-sm font-semibold text-orange-100 disabled:opacity-60"
                      >
                        {refundPending ? 'Refunding...' : 'Refund'}
                      </button>
                    )}
                  </div>
                  {/* <div className="mt-auto pt-80 pb-2 text-xs leading-relaxed text-orange-100/45">
                    Note: After launch, you can swap sAL to AL at 1:1.
                  </div> */}
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-orange-400/15 bg-black/20 px-4 py-4 sm:p-5 backdrop-blur-none sm:backdrop-blur">
                <div className="text-xs font-semibold tracking-wide text-orange-100/70">Experiment TWO.</div>
                <p className="mt-2 text-xs sm:text-base leading-relaxed text-orange-100/55">
                  Send any amount of BNB to the contract address.
                </p>
                <div className="mt-2 text-[10px] sm:text-[11px] leading-relaxed font-semibold text-orange-400">
                  <span>Contract address: </span>
                  <span className="break-all">{alphaContractAddress || 'NOT CONFIGURED'}</span>
                </div>
              </div>
            </aside>

            <aside className={`relative ${mobileView === 'airdrop' ? 'block' : 'hidden'} sm:block lg:col-span-2 lg:order-3`}>
              <div
                ref={formContainerRef}
                className="relative overflow-hidden rounded-2xl border border-orange-400/15 bg-black/70 backdrop-blur-none sm:backdrop-blur-xl px-4 py-5 sm:border-orange-400/12 sm:bg-black/40 sm:p-8 shadow-[0_0_55px_rgba(251,146,60,0.12)] scroll-mt-24 sm:scroll-mt-28"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 via-transparent to-amber-200/5 pointer-events-none"></div>

                <div className="relative">
                  <h2 className="whitespace-nowrap text-sm sm:text-lg font-semibold text-orange-50">Airdrop eligibility</h2>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-orange-100/60">
                    Submit your X handle, tweet link, and Binance Keyless Wallet address for validation.
                  </p>

                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-orange-100/70">X handle</label>
                      <input
                        type="text"
                        placeholder="@yourhandle"
                        className="w-full rounded-xl border border-orange-400/20 bg-black/30 px-4 py-3 text-sm text-orange-50 placeholder:text-orange-100/30 outline-none transition-colors focus:border-orange-400/40 focus:bg-black/40 focus:ring-2 focus:ring-orange-400/20"
                        value={xHandle}
                        onChange={(e) => setXHandle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-orange-100/70">Tweet link</label>
                      <input
                        type="text"
                        placeholder="https://x.com/..."
                        className="w-full rounded-xl border border-orange-400/20 bg-black/30 px-4 py-3 text-sm text-orange-50 placeholder:text-orange-100/30 outline-none transition-colors focus:border-orange-400/40 focus:bg-black/40 focus:ring-2 focus:ring-orange-400/20"
                        value={tweetLink}
                        onChange={(e) => setTweetLink(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-orange-100/70">Keyless wallet address</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        className="w-full rounded-xl border border-orange-400/20 bg-black/30 px-4 py-3 text-sm text-orange-50 placeholder:text-orange-100/30 outline-none transition-colors focus:border-orange-400/40 focus:bg-black/40 focus:ring-2 focus:ring-orange-400/20"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-orange-400 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(251,146,60,0.35)] transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Validating...' : 'Submit'}
                    </button>

                    {validationMessage && (
                      <div className="rounded-xl border border-orange-400/15 bg-black/40 p-3 text-sm text-orange-100/80">
                        {validationMessage}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </aside>
          </div>
        </div>
        <div className="container mx-auto px-5 pb-8 sm:px-4">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <div className="rounded-2xl border border-orange-400/15 bg-black/20 px-4 py-5 sm:p-6 backdrop-blur-none sm:backdrop-blur max-w-[720px]">
              <div className="text-xs font-semibold tracking-wide text-orange-100/70">Experiment Details</div>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-orange-100/55">
                Sample allocation. Please adjust to match the final plan.
              </p>
              <div
                className="mt-5 grid gap-6 md:grid-cols-[220px_1fr] md:items-center"
                onMouseLeave={() => setActiveSegment(null)}
              >
                <div className="relative mx-auto h-48 w-48 sm:h-56 sm:w-56">
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 30%, rgba(251,191,36,0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(251,146,60,0.22), transparent 60%)',
                    }}
                  ></div>
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background:
                        'conic-gradient(from 210deg, rgba(251,146,60,0.95) 0deg 216deg, rgba(251,191,36,0.9) 216deg 306deg, rgba(253,230,138,0.9) 306deg 360deg)',
                    }}
                  ></div>
                  <div
                    className="absolute inset-0 rounded-full opacity-50 animate-spin [animation-duration:28s] pointer-events-none"
                    style={{
                      backgroundImage:
                        'repeating-conic-gradient(from 0deg, rgba(251,146,60,0.25) 0deg 2deg, transparent 2deg 10deg)',
                    }}
                  ></div>
                  <div
                    className="absolute inset-2 rounded-full opacity-40 pointer-events-none"
                    style={{
                      backgroundImage:
                        'repeating-radial-gradient(circle, rgba(251,191,36,0.18) 0 1px, transparent 1px 9px)',
                    }}
                  ></div>
                  <div className="absolute inset-1 rounded-full border border-orange-400/25 shadow-[0_0_35px_rgba(251,146,60,0.35)] pointer-events-none"></div>
                  <div className="absolute inset-6 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-black/85 backdrop-blur pointer-events-none"></div>
                  </div>
                  <svg
                    className="absolute inset-0 -rotate-90 pointer-events-auto"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    {(() => {
                      let cumulative = 0;
                      return chartSegments.map((segment) => {
                        const dash = (segment.value / 100) * donutCircumference;
                        const offset = (cumulative / 100) * donutCircumference;
                        cumulative += segment.value;
                        const isActive = activeSegment === segment.key;
                        return (
                          <g
                            key={segment.key}
                            style={{
                              transformOrigin: '50px 50px',
                              transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            }}
                            className="transition-transform duration-300"
                          >
                            <circle
                              cx="50"
                              cy="50"
                              r={donutRadius}
                              fill="transparent"
                              strokeLinecap="butt"
                              strokeWidth={18}
                              stroke="transparent"
                              strokeDasharray={`${dash} ${donutCircumference}`}
                              strokeDashoffset={`-${offset}`}
                              className="cursor-pointer"
                              pointerEvents="stroke"
                              onMouseEnter={() => setActiveSegment(segment.key)}
                              onMouseMove={() => setActiveSegment(segment.key)}
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r={donutRadius}
                              fill="transparent"
                              strokeLinecap="butt"
                              strokeWidth={isActive ? 9 : 7}
                              strokeDasharray={`${dash} ${donutCircumference}`}
                              strokeDashoffset={`-${offset}`}
                              className={`${segment.strokeClass} transition-all duration-300 pointer-events-none`}
                              onMouseEnter={() => setActiveSegment(segment.key)}
                            />
                          </g>
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <div className="text-[11px] font-semibold text-orange-100/60 tracking-[0.2em]">ALLOCATION</div>
                    <div className="mt-2 text-xl font-semibold text-orange-200">100%</div>
                  </div>
                  <div className="absolute -top-1 right-8 h-2.5 w-2.5 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.8)] pointer-events-none"></div>
                  <div className="absolute bottom-6 left-6 h-2 w-2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.8)] pointer-events-none"></div>
                </div>
                <div className="grid gap-3">
                  {chartSegments.map((segment) => {
                    const isActive = activeSegment === segment.key;
                    return (
                      <div
                        key={segment.key}
                        className={`rounded-xl border border-orange-400/15 bg-black/25 px-3 py-3 transition-transform duration-200 ${isActive ? 'scale-[1.03] border-orange-400/40 bg-black/40' : ''}`}
                        onMouseEnter={() => setActiveSegment(segment.key)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-orange-100/70">
                            <span className={`h-2.5 w-2.5 rounded-full ${segment.dotClass}`}></span>
                            {segment.label}
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-transform ${segment.badgeClass} ${isActive ? 'scale-110' : ''}`}
                          >
                            {segment.value}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block flex-1">
              <div className="h-full rounded-2xl border border-orange-400/10 bg-black/20 px-5 py-6 backdrop-blur-none sm:backdrop-blur">
                <div className="text-xs font-semibold tracking-wide text-orange-100/70">Questions</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.4em] text-orange-100/45"> </div>
                <div className="mt-5 space-y-3">
                  {faqs.map((item, index) => {
                    const isOpen = faqOpenIndex === index;
                    return (
                      <div key={item.question} className="rounded-xl border border-orange-400/15 bg-black/30">
                        <button
                          type="button"
                          onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-xs font-semibold text-orange-100/80 hover:text-orange-100"
                          aria-expanded={isOpen}
                        >
                          <span>{item.question}</span>
                          <span
                            className={`text-orange-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          >
                            v
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-orange-400/10 px-4 py-3 text-xs leading-relaxed text-orange-100/60">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 lg:hidden">
            <div className="rounded-2xl border border-orange-400/10 bg-black/20 px-4 py-5 backdrop-blur-none">
              <div className="text-xs font-semibold tracking-wide text-orange-100/70">Questions</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.4em] text-orange-100/45">FAQ</div>
              <div className="mt-5 space-y-3">
                {faqs.map((item, index) => {
                  const isOpen = faqOpenIndex === index;
                  return (
                    <div key={item.question} className="rounded-xl border border-orange-400/15 bg-black/30">
                      <button
                        type="button"
                        onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-xs font-semibold text-orange-100/80 hover:text-orange-100"
                        aria-expanded={isOpen}
                      >
                        <span>{item.question}</span>
                        <span
                          className={`text-orange-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        >
                          v
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-orange-400/10 px-4 py-3 text-xs leading-relaxed text-orange-100/60">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none fixed bottom-0 right-0 h-56 w-[20rem] sm:absolute sm:h-64 sm:w-[26rem]">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 120% at 100% 100%, rgba(252, 211, 77, 0.22) 0%, rgba(251, 191, 36, 0.12) 28%, rgba(251, 191, 36, 0.05) 45%, rgba(251, 191, 36, 0) 68%)',
            }}
          ></div>
        </div>
      </main>
    </div>
  );
}
