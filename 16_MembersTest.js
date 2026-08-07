/**
 * ============================================================
 * PHINOX BOS — Members Module Tests
 * Run: Select testMembersModule → Run in GAS editor
 * ============================================================
 */

function testMembersModule() {
    console.log('=== Members Module Tests ===');
    var passed = 0;
    var failed = 0;
    
    function assert(cond, msg) {
      if (cond) { passed++; console.log('✓ ' + msg); }
      else { failed++; console.error('✗ ' + msg); }
    }
    
    // 1. addMember
    var memId = addMember({ name: 'TestMember', email: 'test@member.com', role: 'Designer', phone: '12345' });
    assert(typeof memId === 'string' && memId.length > 0, 'addMember returns ID');
    
    // 2. getMemberById
    var found = getMemberById(memId);
    assert(found !== null && found[MEMBER_COL.FULL_NAME] === 'TestMember', 'getMemberById finds member');
    assert(found[MEMBER_COL.EMAIL] === 'test@member.com', 'getMemberById email correct');
    assert(found[MEMBER_COL.STATUS] === 'Active', 'getMemberById status Active');
    
    // 3. getMember (by name)
    var byName = getMember('TestMember');
    assert(byName !== null && byName[MEMBER_COL.MEMBER_ID] === memId, 'getMember finds by name');
    
    // 4. getMembers
    var all = getMembers();
    assert(Array.isArray(all), 'getMembers returns array');
    assert(all.length >= 1, 'getMembers has entries');
    
    // 5. totalMembers
    var count = totalMembers();
    assert(count >= 1, 'totalMembers >= 1');
    
    // 6. updateMember
    updateMember(memId, { phone: '99999', notes: 'Updated note' });
    var updated = getMemberById(memId);
    assert(updated[MEMBER_COL.PHONE] === '99999', 'updateMember phone updated');
    assert(updated[MEMBER_COL.NOTES] === 'Updated note', 'updateMember notes updated');
    
    // 7. activeMembers / inactiveMembers
    var active = activeMembers();
    assert(active.some(function(m) { return m[MEMBER_COL.MEMBER_ID] === memId; }), 'activeMembers includes test member');
    
    // 8. memberWorkload (no tasks = 0%)
    var wl = memberWorkload(found);
    assert(wl === 0, 'memberWorkload with no tasks = 0');
    
    // 9. isMemberAvailable
    assert(isMemberAvailable(found) === true, 'isMemberAvailable true at 0% workload');
    
    // 10. getAvailableMember
    var avail = getAvailableMember();
    assert(avail !== null, 'getAvailableMember returns member');
    
    // 11. topProductiveMembers (no mutation test)
    var top1 = topProductiveMembers(1);
    assert(Array.isArray(top1) && top1.length === 1, 'topProductiveMembers returns 1');
    var allAfter = getMembers();
    assert(allAfter.length === all.length, 'topProductiveMembers does not mutate original');
    
    // 12. mostLateMembers
    var late = mostLateMembers(3);
    assert(Array.isArray(late), 'mostLateMembers returns array');
    
    // 13. lowestQualityMembers
    var lowQ = lowestQualityMembers(3);
    assert(Array.isArray(lowQ), 'lowestQualityMembers returns array');
    
    // 14. refreshMembersDashboard
    var dash = refreshMembersDashboard();
    assert(Array.isArray(dash), 'refreshMembersDashboard returns array');
    assert(dash[0][0] === 'Members', 'Dashboard has Members metric');
    
    // 15. deleteMember
    deleteMember(memId);
    assert(getMemberById(memId) === null, 'deleteMember removes member');
    assert(totalMembers() === count - 1, 'totalMembers decremented');
    
    // Cleanup: ensure no test members left
    var remaining = getMembers().filter(function(m) { return String(m[MEMBER_COL.EMAIL]).indexOf('test@member.com') > -1; });
    remaining.forEach(function(m) { deleteMember(m[MEMBER_COL.MEMBER_ID]); });
    
    console.log('=== Members Tests: ' + passed + ' passed, ' + failed + ' failed ===');
    if (failed > 0) throw new Error(failed + ' tests failed');
    return 'Members module: ' + passed + ' tests passed';
  }