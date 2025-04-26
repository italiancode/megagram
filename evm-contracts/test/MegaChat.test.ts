import { expect } from "chai";
import { ethers } from "hardhat";
import { MegaChat } from "../typechain-types";

describe("MegaChat", function () {
  let megaChat: MegaChat;

  beforeEach(async function () {
    const MegaChat = await ethers.getContractFactory("MegaChat");
    megaChat = await MegaChat.deploy();
    await megaChat.waitForDeployment();
  });

  describe("User Management", function () {
    it("Should set and get username", async function () {
      const [user] = await ethers.getSigners();
      await megaChat.setUsername("testUser");
      expect(await megaChat.getUsernameByAddress(user.address)).to.equal("testUser");
    });
  });

  describe("Direct Messaging", function () {
    it("Should send and receive direct messages", async function () {
      const [sender, receiver] = await ethers.getSigners();
      await megaChat.sendDirectMessage(receiver.address, "Hello!");
      const messages = await megaChat.getDirectMessages(receiver.address);
      expect(messages[0].content).to.equal("Hello!");
      expect(messages[0].sender).to.equal(sender.address);
    });
  });

  describe("Group Chat", function () {
    it("Should create a group and send messages", async function () {
      const [creator, member1, member2] = await ethers.getSigners();
      await megaChat.createGroup("group1", "Test Group", [member1.address, member2.address]);
      
      const groupInfo = await megaChat.getGroupById("group1");
      expect(groupInfo.name).to.equal("Test Group");
      expect(groupInfo.members).to.include(member1.address);
      expect(groupInfo.members).to.include(member2.address);

      await megaChat.sendGroupMessage("group1", "Hello group!");
      const messages = await megaChat.getGroupMessages("group1");
      expect(messages[0].content).to.equal("Hello group!");
    });
  });
}); 