import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSessionCards} from '../integrations/botanic-notcards/home.mjs';

test('note-only cards, linked notebooks and prior chat sessions each appear once', () => {
  const note = {id:'note1', title:'A personal note', conversationId:null};
  const video = {id:'video1', title:'Video', conversationId:'chat1'};
  const linkedChat = {conversationId:'chat1', title:'Conversation title'};
  const oldChat = {conversationId:'chat2', title:'An existing chat'};
  const entries = buildSessionCards([note, video], [oldChat, linkedChat, oldChat]);
  assert.deepEqual(entries.map(entry => entry.key), ['card:note1','card:video1','chat:chat2']);
  assert.equal(entries[0].conversationId, null);
  assert.equal(entries[1].conversation, linkedChat);
  assert.equal(entries[1].card, video);
  assert.equal(entries[2].card, null);
  assert.equal(entries[2].conversation, oldChat);
  assert.throws(() => buildSessionCards([{id:'missing-binding'}], []), /conversation binding/);
  assert.deepEqual(buildSessionCards([video], [])[0],
    {key:'card:video1', card:video, conversationId:'chat1', conversation:null});
});
