10 COLOR 10,1:SCREEN 2:P=3.1415926#:C=2*P:I=P/20: DIM X(5),Y(5)
11 FOR F=1 TO 5:READ X(F),Y(F):NEXT
12 DATA 0,100,35,35,100,0,35,-35,0,-100
13 FOR H=0 TO 1
14 FOR A=0 TO P STEP I
15 FOR F=1 TO 5
16 X=X(F)*COS(A):Y=Y(F):S=X
17 X=-X*(H<>1)-Y*(H=1)
18 Y=-Y*(H<>1)-S*(H=1)
19 X=INT(X):Y=INT(Y):GOSUB 20:NEXT F,A,H
20 IF H=2 THEN END ELSE U=X*.9+128:V=Y*.75+96:IF F=1 THEN K=U:L=V:RETURN ELSE LINE(K,L)-(U,V):K=U:L=V:RETURN