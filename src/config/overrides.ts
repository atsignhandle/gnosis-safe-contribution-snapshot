/*
  contributions made from Coinbase require remapping the address to a custodial wallet address 
*/
export const CEX_OVERRIDES: Record<string, string> = {
  // albatron9000#4542
  '0xe3f21f1be6131aab64509c4ccf91807446194548866bbbef363db458e0d57252':
    '0xE00Dc5eB53d376a50556f0039FDd3dA7dc83F06B',
  // avax_szn#2301
  '93d45d0c3c8acf3a1a10789fd2416d97a5419ec72d7ee625bccf884b306e9130':
    '0x7AC258e14B6f580a9f2C556022898c813BaD2036',
  // aliciakatz#6843
  '0xcc458f154221c31f14b03772421837cce2969a3d38f81147927f32ef8ec9b85a':
    '0x599Af7f3Eb2Af4f39A8174f1fab2cca09ff11a5d',
  // jonathanbroly#4332 TODO
  '0x073d9da34276075d7344df9f5b62e1785302b8b7da062efc62e2eec1b214eeb8':
    '0x89C14066d9b643BFF11148ddBCc6c32F8E07C3FA',
  // qasak#4459
  '0x2b3772b50ffddc076c74105c787f44d7a0f009932a3814f9f4909a312935dff9':
    '0xb6d84d05b7facFA94FAFB2f40d849B80A3f34FB7',
  // billy_72#4443
  '0xeb05dd124e0cbc16f2352fab345f55d475e51f88752777d2ebf530024edea2d8':
    '0xbF4B0bcDcC7DC29AB19f89d08b3a139893CdCFE6',
  // vitozhang.eth#8367
  '0x15a8bd82db8ab1f89735b3363450f58026bb1584e7945de7857ca6ea6dac1675':
    '0x89E200fB309dfea8577bAa5aBD9268de00E27F7d',
};
