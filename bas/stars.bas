10 SCREEN 2
20 DIM X(30), Y(30), SP(30)
30 FOR I=0 TO 30: X(I) = INT(RND * 255): Y(I) = INT(RND * 191): SP(I) = INT(1 + RND * 2):NEXT
40 FOR I=0 TO 30: PSET(X(I), Y(I)), 1
50 X(I) = X(I) - SP(I): IF X(I) < 0 THEN X(I) = 255: Y(I) = INT(RND * 191): SP(I) = INT(1 + RND * 2)
60 PSET(X(I), Y(I)), 15: NEXT
70 SLEEP 1:GOTO 40
