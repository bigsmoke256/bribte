-- Fix the fake receipt that was previously auto-approved - mark as rejected
UPDATE receipt_uploads SET status = 'rejected', review_notes = 'Rejected: fake/test receipt detected and removed by admin.'
WHERE id = 'd180148c-f45a-4f9f-935b-bbc8e984948a';

-- Fix the stuck "processing" receipt 
UPDATE receipt_uploads SET status = 'rejected', review_notes = 'Processing timed out (stack overflow error during original processing).'
WHERE id = '1d4b923b-11e0-462a-8ee8-8b534c58e8c4';
